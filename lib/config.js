const Common = require('ethereumjs-common')
const argv = require('yargs')
const fs = require('fs')
const path = require('path')
var Ajv = require('ajv')
const configSchema = require('./config-schema.json')

const parseCommands = () => {
  argv
    .usage('Usage: $0 -c [configFile]')
    .usage('Usage: $0 -n  [network]')
    .alias('c', 'configFile')
    .example('$0 -c customNetwork.json', 'run devp2p-network with custom network')
    .example('$0 -n mainnet', 'run devp2p-network with standard network')
    .nargs('c', 1)
    .describe('c', 'Loads network specification config file')
    .alias('n', 'network')
    .nargs('n', 1)
    .describe('n', 'loads configuration for default ethereum nodes mainnet, goerli, rinkeby, morden ...')
    .default('n', 'mainnet')
    .help('h')
    .alias('h', 'help')
  const args = argv.parse()
  console.log(args)
  return {
    configFile: args.configFile,
    network: args.network
  }
}
const getConfig = ({ configFile, network }) => {
  console.log(configFile)
  if (configFile) return getConfigFromFile(configFile)
  return getCommonConfig(network)
}
const removePrefix0x = (value) => {
  if (value.startsWith('0x')) return value.slice(2)
  return value
}

const getConfigFromFile = (configFile) => {
  const resolvedPath = path.resolve(configFile)
  if (fs.statSync(resolvedPath)) {
    const rawConfig = fs.readFileSync(resolvedPath)
    const config = JSON.parse(rawConfig)
    config.genesisHash = removePrefix0x(config.genesisHash)
    const ajv = new Ajv()
    const valid = ajv.validate(configSchema, config)
    if (!valid) throw new Error(ajv.errors)
    return config
  }
  throw new Error(`Could not find ${resolvedPath}`)
}

const getCommonConfig = (network) => {
  const common = new Common(network)
  const bootNodes = common.bootstrapNodes().map((node) => {
    return {
      address: node.ip,
      udpPort: node.port,
      tcpPort: node.port
    }
  })
  const { hash, difficulty } = common.genesis()
  const config = {
    bootNodes,
    networkID: parseInt(common.networkId(), 10),
    genesisHash: removePrefix0x(hash),
    genesisTD: parseInt(difficulty, 10)
  }
  const ajv = new Ajv()
  const valid = ajv.validate(configSchema, config)
  if (!valid) throw new Error(JSON.stringify(ajv.errors, null, 2))
  return config
}

module.exports = {
  parseCommands,
  getConfig
}
