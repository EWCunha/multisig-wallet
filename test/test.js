const { expectRevert } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")
const { assert } = require("console")
const MultiSig = artifacts.require("MultiSig")

contract("Multisig", (accounts) => {
    let multiSig
    beforeEach(async () => {
        multiSig = await MultiSig.new([accounts[0], accounts[1], accounts[2]], 2, { from: accounts[0], value: 1000 })
    })

    it("Should create new transfer", async () => {
        await multiSig.createTransfer(50, accounts[5], { from: accounts[1] })
        const transfers = await multiSig.transfers(0)
        const nextId = parseInt(await multiSig.nextId())

        assert(nextId === 1)
        assert(parseInt(transfers.id) === 0)
        assert(parseInt(transfers.amount) === 50)
        assert(transfers.to === accounts[5])
        assert(transfers.sent === false)
    })

    it("Should NOT create new transfer if sender is not approver", async () => {
        await expectRevert(multiSig.createTransfer(50, accounts[2], { from: accounts[5] }),
            "only approver allowed")
    })

    it("Should APPROVE transfer from approver", async () => {
        await multiSig.createTransfer(50, accounts[5], { from: accounts[1] })
        await multiSig.sendTransfer(0, { from: accounts[0] })
        const approved0 = await multiSig.approvals(accounts[0], 0)
        const approved1 = await multiSig.approvals(accounts[1], 0)
        const approved2 = await multiSig.approvals(accounts[2], 0)
        const transfer = await multiSig.transfers(0)

        assert(approved0 === true)
        assert(approved1 === false)
        assert(approved2 === false)
        assert(transfer.sent === false)
    })

    it("Should SEND transfer", async () => {
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[5]))
        await multiSig.createTransfer(50, accounts[5], { from: accounts[1] })
        await multiSig.sendTransfer(0, { from: accounts[0] })
        await multiSig.sendTransfer(0, { from: accounts[1] })
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[5]))
        const transfer = await multiSig.transfers(0)

        assert(transfer.sent === true)
        assert(balanceAfter.sub(balanceBefore).toNumber() === 50)
    })

    it("Should NOT send transfer if sender is not approver", async () => {
        await multiSig.createTransfer(50, accounts[5], { from: accounts[1] })

        await expectRevert(multiSig.sendTransfer(0, { from: accounts[5] }),
            "only approver allowed")
    })

    it("Should NOT send transfer if transfer has been already sent", async () => {
        await multiSig.createTransfer(50, accounts[5], { from: accounts[1] })
        await multiSig.sendTransfer(0, { from: accounts[0] })
        await multiSig.sendTransfer(0, { from: accounts[1] })

        await expectRevert(multiSig.sendTransfer(0, { from: accounts[2] }),
            "transfer has already been sent")
    })

    it("Should NOT send transfer if quorum not reached", async () => {
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[5]))
        await multiSig.createTransfer(50, accounts[5], { from: accounts[1] })
        await multiSig.sendTransfer(0, { from: accounts[0] })
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[5]))

        assert(balanceAfter.sub(balanceBefore).toNumber() === 0)
    })
})