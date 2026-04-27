import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("INFT", function () {
  async function deployFixture() {
    const [owner, recipient, stranger] = await ethers.getSigners();

    const oracle = await ethers.deployContract("MockOracle");
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();

    const inft = await ethers.deployContract("INFT", [
      "AI Agent NFTs",
      "AINFT",
      oracleAddress,
    ]);
    await inft.waitForDeployment();

    return { owner, recipient, stranger, oracle, oracleAddress, inft };
  }

  it("deploys with the oracle address and lets the owner mint", async function () {
    const { owner, oracleAddress, inft } = await deployFixture();

    expect(await inft.owner()).to.equal(owner.address);
    expect(await inft.oracle()).to.equal(oracleAddress);

    await inft.mint(owner.address, "0g://dataset/test", ethers.ZeroHash);

    expect(await inft.ownerOf(1n)).to.equal(owner.address);
    expect(await inft.getEncryptedURI(1n)).to.equal("0g://dataset/test");
    expect(await inft.getMetadataHash(1n)).to.equal(ethers.ZeroHash);
  });

  it("allows the owner to mint and transfer with a valid proof", async function () {
    const { owner, recipient, inft } = await deployFixture();

    await inft.mint(owner.address, "0g://dataset/original", ethers.ZeroHash);

    const sealedKey = ethers.toUtf8Bytes("sealed-key");
    const newHash = ethers.keccak256(ethers.toUtf8Bytes("new-hash"));
    const newUri = "0g://dataset/updated";
    const proof = ethers.concat([
      ethers.getBytes(newHash),
      ethers.getBytes(ethers.zeroPadValue("0x01", 32)),
      ethers.toUtf8Bytes(newUri),
    ]);

    await expect(
      inft.transfer(owner.address, recipient.address, 1n, sealedKey, proof),
    ).to.emit(inft, "MetadataUpdated");

    expect(await inft.ownerOf(1n)).to.equal(recipient.address);
    expect(await inft.getMetadataHash(1n)).to.equal(newHash);
    expect(await inft.getEncryptedURI(1n)).to.equal(newUri);
  });

  it("rejects transfer when the proof is empty", async function () {
    const { owner, recipient, inft } = await deployFixture();

    await inft.mint(owner.address, "0g://dataset/original", ethers.ZeroHash);

    await expect(
      inft.transfer(owner.address, recipient.address, 1n, ethers.toUtf8Bytes("sealed"), "0x"),
    ).to.be.revertedWith("Invalid proof");
  });

  it("lets the owner authorize usage", async function () {
    const { owner, recipient, inft } = await deployFixture();

    await inft.mint(owner.address, "0g://dataset/original", ethers.ZeroHash);

    await expect(
      inft.authorizeUsage(1n, recipient.address, ethers.toUtf8Bytes("read-only")),
    ).to.emit(inft, "UsageAuthorized").withArgs(1n, recipient.address);
  });

  it("lets a new user pay for usage access", async function () {
    const { owner, recipient, inft } = await deployFixture();

    await inft.mint(owner.address, "0g://dataset/original", ethers.ZeroHash);

    const fee = await inft.USAGE_FEE();
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const permissions = ethers.toUtf8Bytes("paid-read-only");

    await expect(
      inft.connect(recipient).purchaseUsage(1n, permissions, { value: fee }),
    ).to.emit(inft, "UsagePurchased").withArgs(1n, recipient.address, fee);

    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(fee);
    expect(await inft.getAuthorization(1n, recipient.address)).to.equal(
      ethers.hexlify(permissions),
    );
  });

  it("rejects usage purchases with the wrong fee", async function () {
    const { owner, recipient, inft } = await deployFixture();

    await inft.mint(owner.address, "0g://dataset/original", ethers.ZeroHash);

    await expect(
      inft.connect(recipient).purchaseUsage(1n, ethers.toUtf8Bytes("paid"), {
        value: 1n,
      }),
    ).to.be.revertedWith("Incorrect usage fee");
  });
});
