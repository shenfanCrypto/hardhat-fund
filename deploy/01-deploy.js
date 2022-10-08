const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = await network.config.chainId

    // const ethUsdPriceFeedAddress = networkConfig[chainId][ethUsdPriceFeed];
    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const ethUSdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUSdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    const args = [ethUsdPriceFeedAddress]

    const fundMe = await deploy("FundMe", {
        from: deployer,
        log: true,
        args: args,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }

    log("___________________________________________")
}

module.exports.tags = ["all", "fundme"]
