const hre = require("hardhat");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    // Deploy the CryptoDevsNFT contract
    const nftContract = await hre.ethers.deployContract("CryptoDevsNFT");
    // Wait for the contract to deploy
    await nftContract.waitForDeployment();
	console.log("CryptoDevsNFT deployed to: ", nftContract.target);

	// Deploy the contractName contract
	const fakeNFTMarketplaceContract = await hre.ethers.deployContract("FakeNFTMarketplace");
	// Wait for the contract to deploy
	await fakeNFTMarketplaceContract.waitForDeployment();
	console.log("FakeNFTMarketplace deployed to: ", fakeNFTMarketplaceContract.target);

	// Deploy the DAOContract contract
	const daoContract = await hre.ethers.deployContract("CryptoDevsDao", [
		fakeNFTMarketplaceContract.target,
		nftContract.target
	]);
	// Wait for the contract to deploy
	await daoContract.waitForDeployment();
	console.log("DAOContract deployed to: ", daoContract.target);

	// Sleep for 30 seconds to let Etherscan catch up with the deployments
	await sleep(30*1000);

	// Verify the contract on Etherscan
	await hre.run("verify:verify", {
		address: nftContract.target,
		constructorArguments: []
	});

	// Verify the contract on Etherscan
	await hre.run("verify:verify", {
		address: fakeNFTMarketplaceContract.target,
		constructorArguments: []
	});

	// Verify the contract on Etherscan
	await hre.run("verify:verify", {
		address: daoContract.target,
		constructorArguments: [fakeNFTMarketplaceContract.target, nftContract.target]
	});
}

// Call the main function and catch any error
// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});