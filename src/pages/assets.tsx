import { useInfiniteQuery } from "@tanstack/react-query";
import { Alchemy, Network, type OwnedNft } from "alchemy-sdk";
import { groupBy } from "lodash";
import { useMemo } from "react";
import invariant from "tiny-invariant";

import { env } from "~/env.mjs";

const settings = {
  apiKey: env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

function OwnedNftListItem({ nft }: { nft: OwnedNft }) {
  return (
    <li className="flex py-6">
      <div className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={nft.media[0]?.thumbnail}
          alt={nft.title}
          className="h-24 w-24 rounded-md object-cover object-center sm:h-24 sm:w-24"
        />
      </div>

      <div className="ml-4 flex flex-1 flex-col sm:ml-6">
        <div>
          <div className="flex justify-between">
            <div>
              <h4 className="text-base">
                <a
                  href={`https://etherscan.io/nft/${nft.contract.address}/${nft.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-2 font-medium text-gray-700 hover:text-gray-800"
                >
                  {nft.balance !== 1 && nft.balance} {nft.title || "Untitled"}
                </a>

                {nft.spamInfo && (
                  <span className="ml-1 inline-flex items-center rounded-md bg-yellow-50 px-1 py-0.5 text-xs font-medium uppercase text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                    Possible spam
                  </span>
                )}
              </h4>
              {(typeof nft.contract.name !== "undefined" ||
                typeof nft.contract.openSea?.collectionName !==
                  "undefined") && (
                <p className="mt-1 text-sm text-gray-500">
                  {nft.contract.openSea?.collectionName ?? nft.contract.name}{" "}
                  <span className="break-all">#{nft.tokenId}</span>
                </p>
              )}
            </div>
            <p className="ml-4 text-base font-medium text-gray-900">$tx.cost</p>
          </div>
        </div>
      </div>
    </li>
  );
}

function OwnedNftsGroupHeader({
  contract,
  count,
}: {
  contract: {
    address: string;
    name?: string | undefined;
    openSea?: { collectionName?: string | undefined } | undefined;
    tokenType: string;
  };
  count: number;
}) {
  const { address, name, openSea, tokenType } = contract;

  return (
    <div className="sticky top-0 z-10 flex justify-between border-y border-b-gray-200 border-t-gray-100 bg-gray-50 px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900">
      <h3>
        {openSea?.collectionName ?? name ?? address}
        <span className="ml-2 inline-flex items-center rounded-md bg-gray-50 px-1 py-0.5 text-xs font-medium uppercase text-gray-600 ring-1 ring-inset ring-gray-500/10">
          {tokenType}
        </span>
      </h3>

      <div>
        {count} {count != 1 ? "tokens" : "token"}
      </div>
    </div>
  );
}

function OwnedNftsContainer({ address }: { address: string }) {
  const { error, data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["alchemy.nft.getNftsForOwner", address] as const,
      queryFn: function ({ queryKey: [_, address], pageParam }) {
        invariant(
          typeof pageParam === "string" || typeof pageParam === "undefined",
          "pageParam of unknown type"
        );
        return alchemy.nft.getNftsForOwner(address, { pageKey: pageParam });
      },
      getNextPageParam: function (lastPage) {
        return lastPage.pageKey;
      },
    });

  // const data2 = alchemy.core.getTokensForOwner(address, {});

  const ownedNfts = useMemo(
    () =>
      (data?.pages ?? []).reduce<OwnedNft[]>(
        (acc, page) => [...acc, ...page.ownedNfts],
        []
      ),
    [data?.pages]
  );

  const groupedOwnedNfts = useMemo(
    () => groupBy(ownedNfts, ({ contract: { address } }) => address),
    [ownedNfts]
  );

  if (error) {
    return (
      <div>
        <h1>Error</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <section>
      <h2 id="cart-heading">
        {ownedNfts.length}
        {hasNextPage ? "+" : ""} NFTs found
      </h2>
      {Object.entries(groupedOwnedNfts).map(
        ([contractAddress, ownedNftsInCollection]) => {
          const sampleNft = ownedNftsInCollection[0];
          invariant(!!sampleNft, "groupBy returned an entry with no tokens");
          const { contract } = sampleNft;

          return (
            <div key={contractAddress} className="relative">
              <OwnedNftsGroupHeader
                contract={contract}
                count={ownedNftsInCollection.length}
              />
              <ul
                role="list"
                className="divide-y divide-gray-200 border-y border-gray-200"
              >
                {ownedNftsInCollection.map((nft) => (
                  <OwnedNftListItem
                    key={`${nft.contract.address}-${nft.tokenId}`}
                    nft={nft}
                  />
                ))}
              </ul>
            </div>
          );
        }
      )}

      {hasNextPage && (
        <div className="mt-4">
          <button
            type="button"
            className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

export default function Assets() {
  const address = "tchebotarev.eth";
  // const address = "0xa60b50f27E49d5E606a6a916A3f56ce1555CFc42";

  return (
    <main>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:px-0">
        <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Assets
        </h1>

        <div className="mt-12">
          <OwnedNftsContainer address={address} />
        </div>
      </div>
    </main>
  );
}
