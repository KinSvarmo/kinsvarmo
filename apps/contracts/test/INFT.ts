import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("INFT", function () {
  async function deployFixture() {
    const [owner, recipient, stranger] = await ethers.getSigners();
    const metadata = {
      name: "AI Agent NFTs",
      description: "A private scientific analysis agent.",
      domain: "phytochemistry",
      creatorName: "Dr. Mira Solenne",
      previewOutput: "Predicted alkaloid-like compound families with confidence notes.",
      intelligenceReference: "0g://placeholder/intelligence/alkaloid-v2",
      storageReference: "0g://placeholder/metadata/alkaloid-v2",
      metadataURI: "0g://metadata/alkaloid-v2.json",
    };

    const oracle: any = await ethers.deployContract("MockOracle");
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();

    const inft: any = await ethers.deployContract("INFT", [
      "AI Agent NFTs",
      "AINFT",
      oracleAddress,
    ] as any);
    await inft.waitForDeployment();

    return { owner, recipient, stranger, oracle, oracleAddress, inft, metadata };
  }

  async function mintSampleToken(
    inft: any,
    ownerAddress: string,
    metadata: {
      name: string;
      description: string;
      domain: string;
      creatorName: string;
      previewOutput: string;
      intelligenceReference: string;
      storageReference: string;
      metadataURI: string;
    },
    overrides?: Partial<{
      encryptedURI: string;
      metadataHash: string;
    }>,
  ) {
    const encryptedURI = overrides?.encryptedURI ?? "0g://dataset/original";
    const metadataHash = overrides?.metadataHash ?? ethers.ZeroHash;

    await inft.mint(ownerAddress, encryptedURI, metadataHash, metadata);
    return { encryptedURI, metadataHash };
  }

  function expectStoredMetadata(
    storedMetadata: readonly string[],
    metadata: {
      name: string;
      description: string;
      domain: string;
      creatorName: string;
      previewOutput: string;
      intelligenceReference: string;
      storageReference: string;
      metadataURI: string;
    },
  ) {
    expect(storedMetadata[0]).to.equal(metadata.name);
    expect(storedMetadata[1]).to.equal(metadata.description);
    expect(storedMetadata[2]).to.equal(metadata.domain);
    expect(storedMetadata[3]).to.equal(metadata.creatorName);
    expect(storedMetadata[4]).to.equal(metadata.previewOutput);
    expect(storedMetadata[5]).to.equal(metadata.intelligenceReference);
    expect(storedMetadata[6]).to.equal(metadata.storageReference);
    expect(storedMetadata[7]).to.equal(metadata.metadataURI);
  }

  it("deploys with the oracle address and lets the owner mint", async function () {
    const { owner, oracleAddress, inft, metadata } = await deployFixture();

    expect(await inft.owner()).to.equal(owner.address);
    expect(await inft.oracle()).to.equal(oracleAddress);

    await inft.mint(owner.address, "0g://dataset/test", ethers.ZeroHash, metadata);

    expect(await inft.ownerOf(1n)).to.equal(owner.address);
    expect(await inft.getEncryptedURI(1n)).to.equal("0g://dataset/test");
    expect(await inft.getMetadataHash(1n)).to.equal(ethers.ZeroHash);
    expect(await inft.tokenURI(1n)).to.equal(metadata.metadataURI);

    const storedMetadata = await inft.getAgentMetadata(1n);
    expectStoredMetadata(storedMetadata, metadata);
  });

  it("increments token IDs and keeps metadata isolated per mint", async function () {
    const { owner, recipient, inft, metadata } = await deployFixture();
    const secondMetadata = {
      ...metadata,
      name: "Dose Response Predictor",
      metadataURI: "0g://metadata/dose-response.json",
    };

    await inft.mint(owner.address, "0g://dataset/one", ethers.ZeroHash, metadata);
    await inft.mint(recipient.address, "0g://dataset/two", ethers.ZeroHash, secondMetadata);

    expect(await inft.ownerOf(1n)).to.equal(owner.address);
    expect(await inft.ownerOf(2n)).to.equal(recipient.address);
    expect(await inft.tokenURI(1n)).to.equal(metadata.metadataURI);
    expect(await inft.tokenURI(2n)).to.equal(secondMetadata.metadataURI);

    expectStoredMetadata(await inft.getAgentMetadata(1n), metadata);
    expectStoredMetadata(await inft.getAgentMetadata(2n), secondMetadata);
  });

  it("rejects minting from a non-owner", async function () {
    const { recipient, inft, metadata } = await deployFixture();

    await expect(
      inft.connect(recipient).mint(recipient.address, "0g://dataset/test", ethers.ZeroHash, metadata),
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("allows the owner to mint and transfer with a valid proof", async function () {
    const { owner, recipient, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

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
    const { owner, recipient, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

    await expect(
      inft.transfer(owner.address, recipient.address, 1n, ethers.toUtf8Bytes("sealed"), "0x"),
    ).to.be.revertedWith("Invalid proof");
  });

  it("rejects transfer from a non-owner", async function () {
    const { owner, recipient, stranger, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

    const proof = ethers.concat([
      ethers.getBytes(ethers.keccak256(ethers.toUtf8Bytes("proof"))),
      ethers.getBytes(ethers.zeroPadValue("0x01", 32)),
    ]);

    await expect(
      inft.connect(stranger).transfer(owner.address, recipient.address, 1n, ethers.toUtf8Bytes("sealed"), proof),
    ).to.be.revertedWith("Not owner");
  });

  it("lets the owner authorize usage", async function () {
    const { owner, recipient, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

    await expect(
      inft.authorizeUsage(1n, recipient.address, ethers.toUtf8Bytes("read-only")),
    ).to.emit(inft, "UsageAuthorized").withArgs(1n, recipient.address);

    expect(await inft.getAuthorization(1n, recipient.address)).to.equal(
      ethers.hexlify(ethers.toUtf8Bytes("read-only")),
    );
  });

  it("rejects usage authorization from a non-owner", async function () {
    const { owner, recipient, stranger, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

    await expect(
      inft.connect(stranger).authorizeUsage(1n, recipient.address, ethers.toUtf8Bytes("read-only")),
    ).to.be.revertedWith("Not owner");
  });

  it("lets a new user pay for usage access", async function () {
    const { owner, recipient, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

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
    const { owner, recipient, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

    await expect(
      inft.connect(recipient).purchaseUsage(1n, ethers.toUtf8Bytes("paid"), {
        value: 1n,
      }),
    ).to.be.revertedWith("Incorrect usage fee");
  });

  it("returns an empty authorization when no permissions were set", async function () {
    const { owner, inft, metadata } = await deployFixture();

    await mintSampleToken(inft, owner.address, metadata);

    expect(await inft.getAuthorization(1n, owner.address)).to.equal("0x");
  });
});
