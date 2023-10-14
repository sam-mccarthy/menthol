require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

const { ALCHEMY_MUMBAI, ALCHEMY_POLYGON, ALCHEMY_RINKEBY, PRIVATE_KEY, NETWORK } = process.env;

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.7",

    defaultNetwork: NETWORK,
    networks: {
        hardhat: {},
        localhost: {},
        mumbai: {
          chainId: 80001,
          url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_MUMBAI}`,
          accounts: [`0x${PRIVATE_KEY}`]
        },
        polygon: {
          chainId: 137,
          url: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_POLYGON}`,
          accounts: [`0x${PRIVATE_KEY}`],
          gasPrice: 40 * 1000000000 //40 * 1 Gwei
        },
        rinkeby: {
          chainId: 4,
          url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_RINKEBY}`,
          accounts: [`0x${PRIVATE_KEY}`]
        },
    }
};