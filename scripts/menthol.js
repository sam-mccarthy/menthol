const hre = require("hardhat");
const fs = require("fs/promises");
const filesystem = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const { Readable } = require("stream");
const { NFTStorage, File } = require("nft.storage");

const Bottleneck = require("bottleneck/es5");

const limiter = new Bottleneck({
          maxConcurrent: 1,
          minTime: 60000 / 25,
        });

require("dotenv").config();

const { NFT_DESC, PINNING_SERVICE_GATEWAY, PINNING_SERVICE_KEY, OWNER, CONTRACT_PATH, CONTRACT_ROYALTY} = process.env;

const client = new NFTStorage({token: PINNING_SERVICE_KEY});

async function createURI(cid){
  return `${PINNING_SERVICE_GATEWAY}${PINNING_SERVICE_GATEWAY.endsWith('/') ? '' : '/'}${cid}`;
}

async function pinNFT(fullPath, description) {
  const parsed = path.parse(fullPath);
  console.log("pinning...");
  const assetCid = await limiter.schedule(() => client.store({
    name,
    description,
    image: new File([await fs.readFile(fullPath)], parsed.name, { type: `image/${parsed.ext.replace('.', '')}`,
  })), {});
  console.log("pinned");
  return assetCid;
}

async function mint(owner, URI, contract) {
  const tx = await contract.mint(owner, URI, parseInt(CONTRACT_ROYALTY), OWNER);
  const receipt = await tx.wait();
  for(const event of receipt.events)
    if(event.event === "Transfer")
      return event.args.tokenId.toString();
  throw new Error('unable to get token id');
}

function sortStr(a, b){
  const ar = a.replace(/\D/g, "");
  const br = b.replace(/\D/g, "");
  return parseInt(ar) - parseInt(br);
}

async function main() {
  console.log("loading contract...");
  
  const content = await fs.readFile(CONTRACT_PATH, {encoding: 'utf8'});
  const json = JSON.parse(content);

  const contract = await hre.ethers.getContractAt(json.contract.abi, json.contract.address);

  const dir = process.argv[2];

  console.log("starting process...");
  const done = path.join(dir, "/done/");
  fs.stat(done, function(err, stat){
    if(err.code === "ENOENT")
      fs.mkdir(done);
  });

  const files = (await fs.readdir(dir)).sort(sortStr);
  const begin = Date.now();

  let i = 1;
  for(const file of files){
    console.log(`${file} - ${i} / ${files.length} - ${(((Date.now() - begin) / i) * (files.length - i)) / 1000}s left.`);

    const fullPath = path.join(dir, file);

    if(!(await fs.lstat(fullPath)).isFile())
      continue;

    const metaCid = await pinNFT(fullPath, NFT_DESC);

    console.log("minting...");
    const id = await mint(OWNER, createURI(metaCid), contract);
    json.contract.tokens.push({
      id, 
      name, 
      metaCid, 
      description: NFT_DESC,
      sold: false,
    });

    await fs.writeFile(CONTRACT_PATH, JSON.stringify(json, null, 2), {encoding: 'utf-8'});
    fs.rename(fullPath, path.join(done, file));
    i++;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
