const {
    time,
    loadFixture,
  } = require("@nomicfoundation/hardhat-network-helpers");
  const { expect } = require("chai");
  
  describe("EnglishAuction", function () {
    async function initAuction() {
        
        const auctionEndTime = (await time.latest()) + (8 * 24 * 60 * 60); // 8 days
  
        const [owner, bidder, second_bidder] = await ethers.getSigners();
        // Deploy NFT contract
        const MyNFT = await ethers.getContractFactory("MyNFT");
        const mynft = await MyNFT.deploy();

        // Mint NFT to sell at auction
        await mynft.mint(await owner.getAddress(), 123);

        // Deploy Auction contract
        const EnglishAuction = await ethers.getContractFactory("EnglishAuction");
        const englishauction = await EnglishAuction.deploy(await mynft.resolvedAddress , 123, 999);

        // Approve NFT transfer to auction contract
        await mynft.approve(await englishauction.resolvedAddress, 123);
        
        await englishauction.start();
  
      return { owner, englishauction, bidder, auctionEndTime, mynft, second_bidder };
    }
  
    describe("Deployment", function () {
      it("Check deployment and auction owner", async function () {
        const {  owner,  englishauction } = await loadFixture(initAuction);

        expect(englishauction.deployTransaction.from).to.equal(owner.address);
      });
    });

    describe("Auction initialization", function () {
        it("Check if auction started", async function() {
            const { englishauction } = await loadFixture(initAuction);

            expect(await englishauction.started()).to.equal(true);
        });

        it("Check if starting balance is equal 0", async function() {
            const { englishauction } = await loadFixture(initAuction);

            expect(await ethers.provider.getBalance(englishauction.address)).to.equal(0);
          });  
    });

    describe("Auction interaction", function () {
        it("Check bidding below minimum treshold", async function() {
            const { englishauction , bidder} = await loadFixture(initAuction);

            await expect(englishauction.connect(bidder).bid({'value':200})).to.be.revertedWith("value < highest");
        });

        it("Check correct bid", async function() {
            const { englishauction , bidder} = await loadFixture(initAuction);
            await englishauction.connect(bidder).bid({'value':2000})

            expect(await englishauction.highestBidder()).to.equal(bidder.address);
        });

        it("Check balance after bid", async function() {
            const { englishauction , bidder} = await loadFixture(initAuction);
            await englishauction.connect(bidder).bid({'value':2000})

            expect(await ethers.provider.getBalance(englishauction.address)).to.equal(2000);
        });

        it("Check withdrawal if you are not highest bidder", async function() {
            const { englishauction , bidder, second_bidder} = await loadFixture(initAuction);

            await englishauction.connect(second_bidder).bid({'value':1000})
            await englishauction.connect(bidder).bid({'value':2000})

            await expect(englishauction.connect(second_bidder).withdraw()).to.changeEtherBalances([second_bidder, englishauction] ,[1000, -1000])
        });

        it("Auction winner", async function() {
            const { englishauction , bidder, auctionEndTime, mynft} = await loadFixture(initAuction);

            await englishauction.connect(bidder).bid({'value':2000})

            await time.increaseTo(auctionEndTime);
            await englishauction.end();

            expect(await mynft.ownerOf(123)).is.equal(bidder.address)

        });
    });
});  