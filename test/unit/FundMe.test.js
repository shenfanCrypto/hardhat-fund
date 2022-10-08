const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { expect, assert } = require("chai")

describe("FundMe", function () {
    let fundMe
    let deployer
    let mockV3Aggregator
    const sendValue = ethers.utils.parseEther("1")
    beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        //  部署了deploy
        fundMe = await ethers.getContract("FundMe", deployer)
        mockV3Aggregator = await ethers.getContract(
            "MockV3Aggregator",
            deployer
        )
    })

    describe("constructor", function () {
        it("should set the right owner", async function () {
            const response = await fundMe.getPriceFeed()
            assert.equal(response, mockV3Aggregator.address)
        })
    })

    describe("fund", function () {
        it("Fill if you don't send enough money", async function () {
            await expect(fundMe.fund()).to.be.reverted
        })

        it("updated the amount funded data structure", async function () {
            await fundMe.fund({ value: sendValue })
            const response = await fundMe.addressToAmountFunded(deployer)
            assert.equal(response.toString(), sendValue.toString())
        })

        it("Adds the funder to array of funders", async function () {
            await fundMe.fund({ value: sendValue })
            const funder = await fundMe.funders(0)
            assert.equal(funder, deployer)
        })
    })

    describe("withdraw", function () {
        beforeEach(async function () {
            await fundMe.fund({ value: sendValue })
        })

        it("Withdraw Eth from a signle founder", async function () {
            const startingFunderBalance = await ethers.provider.getBalance(
                fundMe.address
            )
            const startingDeployerBalance = await ethers.provider.getBalance(
                deployer
            )
            const transactionResponse = await fundMe.withdraw()
            const transactionReceipt = await transactionResponse.wait(1)

            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const gasCost = gasUsed.mul(effectiveGasPrice)

            const endingFunderBalance = await ethers.provider.getBalance(
                fundMe.address
            )
            const endingDeployerBalance = await ethers.provider.getBalance(
                deployer
            )
            assert.equal(endingFunderBalance, 0)
            assert.equal(
                startingFunderBalance.add(startingDeployerBalance).toString(),
                endingDeployerBalance.add(gasCost).toString()
            )
        })

        it("allows us to withdraw eth to multiple founders", async function () {
            const accounts = await ethers.getSigners()
            for (let i = 1; i < 10; i++) {
                await fundMe.connect(accounts[i]).fund({ value: sendValue })
                const startingFunderBalance = await ethers.provider.getBalance(
                    fundMe.address
                )
                const startingDeployerBalance =
                    await ethers.provider.getBalance(deployer)
                const transactionResponse = await fundMe.withdraw()
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                const gasCost = gasUsed.mul(effectiveGasPrice)
                const endingFunderBalance = await ethers.provider.getBalance(
                    fundMe.address
                )
                const endingDeployerBalance = await ethers.provider.getBalance(
                    deployer
                )
                assert.equal(endingFunderBalance, 0)
                assert.equal(
                    startingFunderBalance
                        .add(startingDeployerBalance)
                        .toString(),
                    endingDeployerBalance.add(gasCost).toString()
                )
                // await expect(fundMe.withdraw()).to.be.reverted

                for (let i = 1; i < 10; i++) {
                    assert.equal(
                        await fundMe.addressToAmountFunded(accounts[i].address),
                        0
                    )
                }
            }
        })
        it("Only allows the owner to withdraw", async function () {
            const accounts = await ethers.getSigners()
            const fundMeConnectedContract = await fundMe.connect(accounts[1])
            await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
                "FundMe__NotOwner"
            )
        })
    })
})
