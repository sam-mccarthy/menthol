const hre = require("hardhat");
const fs = require("fs/promises");
const path = require("path");
const FormData = require("form-data");
const filesystem = require("fs");
const axios = require("axios");
const Bottleneck = require("bottleneck/es5");

require("dotenv").config();
const { PINNING_SERVICE_KEY, PINNING_SERVICE_GATEWAY, OWNER, CONTRACT_NAME, CONTRACT_SYMBOL, CONTRACT_DESCRIPTION, CONTRACT_IMAGE, CONTRACT_ROYALTY } = process.env;

const opts = { cidVersion: 1, hashAlg: 'sha2-256'};

const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 60000 / 25,
});

async function pinFile(filepath){
  const name = path.parse(filepath).name;

  let data = new FormData();
  data.append("file", filesystem.createReadStream(filepath));
  data.append("pinataOptions", JSON.stringify(opts));
  data.append("pinataMetadata", JSON.stringify({ name }))

  const config = {
    method: "post",
    url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
    headers: {
      Authorization: `Bearer ${PINNING_SERVICE_KEY}`,
      ...data.getHeaders()
    },
    data: data
  }

  const res = await limiter.schedule(() => axios(config));
  console.log("CID: ", res.data.IpfsHash);
  return res.data.IpfsHash;
}

async function pinJson(json, name){
  let data = JSON.stringify({ pinataOptions: opts, pinataMetadata: { name }, pinataContent: json});
  const config = {
    method: "post",
    url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINNING_SERVICE_KEY}`
    },
    data: data
  }

  const res = await limiter.schedule(() => axios(config));
  console.log("CID: ", res.data.IpfsHash);
  return res.data.IpfsHash;
}

async function createURI(cid){
  return `${PINNING_SERVICE_GATEWAY}${PINNING_SERVICE_GATEWAY.endsWith('/') ? '' : '/'}${cid}`;
}

async function deploy(name, symbol, metadataURI) {
  console.log("compiling...");
  await hre.run('compile');

  const Contract = await hre.ethers.getContractFactory("NFTContract");
  const contract = await Contract.deploy(name, symbol, metadataURI);

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);

  let info = {
      network: hre.network.name,
      contract: {
        name: CONTRACT_NAME,
        address: contract.address,
        signerAddress: contract.signer.address,
        abi: contract.interface.format(),
        tokens: [],
      }
  };

  let str = JSON.stringify(info, null, 2);

  fs.stat("deployments", function(err, stat){
      if(err.code === "ENOENT")
      fs.mkdir("deployments");
  });
  
  const dat = + new Date();
  await fs.writeFile(`deployments/${dat}.json`, str, {encoding: 'utf-8'});
  console.log(`Contract info saved to deployments/${dat}.json`);

  return contract;
}

async function main() {
    console.log("creating IPFS client...");

    //NEED TO FIX FOR NFTSTORAGE
    const imageCID = await pinFile(CONTRACT_IMAGE);
    const metaCID = await pinJson({
        "name": CONTRACT_NAME,
        "description": CONTRACT_DESCRIPTION,
        "image": await createURI(imageCID),
        "seller_fee_basis_points": CONTRACT_ROYALTY,
        "fee_recipient": OWNER,
    }, "metadata.json");
  
    const contract = await deploy(CONTRACT_NAME, CONTRACT_SYMBOL, await createURI(metaCID));
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
  
