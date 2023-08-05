import {
    CryptoDevsDAOABI,
    CryptoDevsDAOAddress,
    CryptoDevsNFTABI,
    CryptoDevsNFTAddress
} from "../constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { readContract, waitForTransaction, writeContract } from "wagmi/actions";
import styles from "../styles/Home.module.css";
import { Inter } from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
})

export default function Home() {
    // Check if users wallet is connected
    const { address, isConnected } = useAccount();

    // State variable to check if the component has been mounted yet
    const [isMounted, setIsMounted] = useState(false);

    // State variable to show loading state while waiting for a transaction to finish
    const [loading, setLoading] = useState(false);

    // Fake NFT ID to purchase, used when creating a proposal
    const [fakeNftTokenId, setFakeNftTokenId] = useState("");
    // State variable to store all proposals in the DAO
    const [proposals, setProposals] = useState([]);
    // State variable to switch between 'Create proposal' and 'View proposals' tab
    const [selectedTab, setSelectedTab] = useState("");

    // Fetch the owner of the DAO
    const daoOwner = useContractRead({
        abi: CryptoDevsDAOABI,
        address: CryptoDevsDAOAddress,
        functionName: "owner",
    });

    // Fetch the balance of the DAO
    const daoBalance = useBalance({
        address: CryptoDevsDAOAddress,
    });

    // Fetch the num of proposals in the DAO
    const numProposalsInDao = useContractRead({
        abi: CryptoDevsDAOABI,
        address: CryptoDevsDAOAddress,
        functionName: "numProposals",
    });

    // Fetch the CryptoDevs balance of the user
    const nftBalanceOfUser = useContractRead({
        abi: CryptoDevsNFTABI,
        address: CryptoDevsNFTAddress,
        functionName: "balanceOf",
        args: [address],
    });

    // Function to make a createProposal transaction in the DAO
    async function createProposal() {
        setLoading(true);

        try {
            const tx = await writeContract({
                abi: CryptoDevsDAOABI,
                address: CryptoDevsDAOAddress,
                functionName: "createProposal",
                args: [fakeNftTokenId],
            });

            await waitForTransaction(tx);
        } catch (error) {
            console.error(error);
            window.alert(error);
        }

        setLoading(false);
    }

    // Function to fetch a proposal by its ID
    async function fetchProposalById(id) {
        try {
            const proposal = await readContract({
                abi: CryptoDevsDAOABI,
                address: CryptoDevsDAOAddress,
                functionName: "proposals",
                args: [id],
            });

            const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;

            const parsedProposal = {
                proposalId: id,
                nftTokenId: nftTokenId.toString(),
                deadline: new Date(parseInt(deadline.toString()) * 1000),
                yayVotes: yayVotes.toString(),
                nayVotes: nayVotes.toString(),
                executed: Boolean(executed),
            }

            return parsedProposal;
        } catch (error) {
            console.error(error);
            window.alert(error);
        }
    }

    // Function to fetch all the proposals in the DAO
    async function fetchAllProposals() {
        try {
            const proposals = [];

            for(let i = 0; i < numProposalsInDao.data; i++) {
                const proposal = await fetchProposalById(i);
                proposals.push(proposal);
            }

            setProposals(proposals);
            return proposals;
        } catch (error) {
            console.error(error);
            window.alert(error);
        }
    }

    // Function to vote on a proposal
    async function voteForProposal(proposalId, vote) {
        setLoading(true);

        try {
            const tx = await writeContract({
                abi: CryptoDevsDAOABI,
                address: CryptoDevsDAOAddress,
                functionName: "voteOnProposal",
                args: [proposalId, vote === "YAY" ? 0 : 1],
            });

            await waitForTransaction(tx);
        } catch (error) {
            console.error(error);
            window.alert(error);
        }

        setLoading(false);
    }

    // Function to execute a proposal after the deadline has been exceeded
    async function executeProposal(id) {
        setLoading(true);

        try {
            const tx = await writeContract({
                abi: CryptoDevsDAOABI,
                address: CryptoDevsDAOAddress,
                functionName: "executeProposal",
                args: [id],
            });

            await waitForTransaction(tx);
        } catch (error) {
            console.error(error);
            window.alert(error);
        }

        setLoading(false);
    }

    // Function to withdraw ether from the DAO contract
    async function withdrawDAOEther() {
        setLoading(true);

        try {
            const tx = await writeContract({
                abi: CryptoDevsDAOABI,
                address: CryptoDevsDAOAddress,
                functionName: "withdrawEther",
                args: [],
            });

            await waitForTransaction(tx);
        } catch (error) {
            console.error(error);
            window.alert(error);
        }

        setLoading(false);
    }

    // Render the content of the tab based on selectedTab
    function renderTab() {
        if (selectedTab === "Create Proposal") {
            return renderCreateProposalTab();
        } else if (selectedTab === "View Proposals") {
            return renderViewProposalsTab();
        }

        return null;
    }

    // Render the 'Create proposal' tab content
    function renderCreateProposalTab() {
        if (loading) {
            return (
                <div className={styles.description}>
                    Loading... Waiting for transaction...
                </div>
            );
        } else if (nftBalanceOfUser.data === 0) {
            return (
                <div className={styles.description}>
                    You do not own any CryptoDev NFT. <br/>
                    <b>You cannot create nor vote on proposals.</b>
                </div>
            );
        } else {
            return (
              <div className={styles.container}>
                <label>Fake NFT Token ID to Purchase: </label>
                <input
                  placeholder="0"
                  type="number"
                  onChange={(e) => setFakeNftTokenId(e.target.value)}
                />
                <button className={styles.button2} onClick={createProposal}>
                    Create
                </button>
              </div>
            );
        }
    }

    function renderViewProposalsTab() {
        if (loading) {
            return (
                <div className={styles.description}>
                    Loading... Waiting for transaction...
                </div>
            );
        } else if (proposals.length === 0) {
            return (
                <div className={styles.description}>
                    No proposals have been created yet
                </div>
            );
        } else {
            return (
                <div>
                    {proposals.map((p, index) => (
                        <div key={index} className={styles.card}>
                            <p>Proposal ID: {p.proposalId}</p>
                            <p>Fake NFT to purchase: {p.nftTokenId}</p>
                            <p>Deadline: {p.deadline.toLocaleString()}</p>
                            <p>Yay votes: {p.yayVotes}</p>
                            <p>Nay votes: {p.nayVotes}</p>
                            <p>Executed?: {p.executed.toString()}</p>
                            {!p.executed ?
                                (
                                    p.deadline.getTime() > Date.now() ?
                                        (
                                            <div className={styles.flex}>
                                                <button className={styles.button2} 
                                                onClick={() => voteForProposal(p.proposalId, "YAY")}>
                                                    Vote YAY
                                                </button>

                                                <button className={styles.button2} 
                                                onClick={() => voteForProposal(p.proposalId, "NAY")}>
                                                    Vote NAY
                                                </button>
                                            </div> 
                                        ) : (
                                            <div className={styles.flex}>
                                                <button className={styles.button2}
                                                onClick={() => executeProposal(p.proposalId)}>
                                                    Execute proposal{" "}
                                                    {p.yayVotes > p.nayVotes ? 
                                                        "(YAY)" : "(NAY)"
                                                    }
                                                </button>
                                            </div>
                                        )
                                ) : (
                                    <div className={styles.description}>Proposal executed</div>
                                )
                            }
                        </div>
                    ))}
                </div>
            )
        }
    }

    // Piece of code that runs each time selectedTab value changes
    // Used to re-fetch all proposals in the DAO when user switches to the View Proposals tab
    useEffect(() => {
        if (selectedTab === "View Proposals") {
            fetchAllProposals();
        }
    }, [selectedTab]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    if (!isConnected) {
        return (
            <div>
                <ConnectButton />
            </div>
        )
    };

    return (
        <div className={inter.className}>
            <Head>
                <title>CryptoDevs DAO</title>
                <meta name="description" content="CryptoDevs DAO" />
                <link rel="icon" href="../public/favicon.ico" />
            </Head>

            <div className={styles.main}>
                <div>
                    <h1 className={styles.title}>Welcome to CryptoDevs!</h1>
                    <div className={styles.description}>Welcome to the DAO!</div>
                    <div className={styles.description}>Your CryptoDevs NFT balance: {(nftBalanceOfUser.data ?? 0).toString()}
                        <br/>
                        {daoBalance.data && (<>Treasury Balance:{" "}{formatEther(daoBalance.data.value).toString()} ETH</>)}
                        <br/>
                        Total Number of Proposals: {(numProposalsInDao.data ?? 0).toString()}
                    </div>

                    <div className={styles.flex}>
                        <button className={styles.button} onClick={() => setSelectedTab("Create Proposal")}>Create Proposal</button>

                        <button className={styles.button} onClick={() => setSelectedTab("View Proposals")}>View Proposals</button>
                    </div>

                    {renderTab()}
                    {/* Display additional withdraw button if connected wallet is owner */}
                    {address && address.toLowerCase() === daoOwner.data.toLowerCase() ? (
                        <div>
                            {loading ? (
                                <button className={styles.button}>Loading...</button>
                            ) : (
                                <button className={styles.button} onClick={withdrawDAOEther}>Withdraw DAO ETH</button>
                            )}
                        </div>
                    ) : (
                        ""
                    )}
                </div>

                <div>
                    <img className={styles.image} src="https://i.imgur.com/buNhbF7.png" />
                </div>

            </div>
        </div>
    );

}