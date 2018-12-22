const chalk = require('chalk')
const os = require('os')
const Buffer = require('safe-buffer').Buffer
const { randomBytes } = require('crypto')
const devp2p = require('ethereumjs-devp2p')
const geoip = require('geoip-lite')
const debug = require('debug')('infura:dpt')
const Web3 = require('web3')
const web3 = new Web3()
const _ = require('lodash')
const db = require('./lib/db')()
const web3Url = `https://mainnet.infura.io/v3/${process.env.INFURA_ID}`
web3.setProvider(new web3.providers.HttpProvider(web3Url))

const EthPeer = db.EthPeer

const PRIVATE_KEY = randomBytes(32)
const BOOTNODES = require('ethereum-common').bootstrapNodes.map((node) => {
  return {
    address: node.ip,
    udpPort: node.port,
    tcpPort: node.port
  }
})

const CHAIN_ID = 1
const GENESIS_TD = 17179869184
const GENESIS_HASH = Buffer.from('d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3', 'hex')

const myStatus = {
  networkId: CHAIN_ID,
  td: devp2p._util.int2buffer(GENESIS_TD),
  genesisHash: GENESIS_HASH,
  bestHash: GENESIS_HASH
}
const dpt = new devp2p.DPT(Buffer.from(PRIVATE_KEY, 'hex'), {
  endpoint: {
    address: '0.0.0.0',
    udpPort: null,
    tcpPort: null
  }
})
// RLPx
const rlpx = new devp2p.RLPx(PRIVATE_KEY, {
  dpt: dpt,
  clientId: `ethereumjs-devp2p/v2.5.1-research/${os.platform()}-${os.arch()}/nodejs`,
  maxPeers: 25,
  capabilities: [
    devp2p.ETH.eth63,
    devp2p.ETH.eth62
  ],
  remoteClientIdFilter: [],
  listenPort: null
})

rlpx.on('error', (err) => console.error(chalk.red(`RLPx error: ${err.stack || err}`)))

rlpx.on('peer:added', (peer) => {
    let hello = peer.getHelloMessage()
    let peerGeo = geoip.lookup(peer._socket.remoteAddress)
    let b = new EthPeer({
      address: peer._socket.remoteAddress,
      capabilitites: hello.capabilities,
      clientId: hello.clientId,
      enode: hello.id.toString('hex'),
      port: peer._socket.remotePort,
      timestamp: new Date(),
    })

    if (_.has(peerGeo, 'll.country')) {
        b.country = peerGeo.ll.country
    }
    if (_.has(peerGeo, 'city')) {
        b.city = peerGeo.city
    }
    b.latitude = peerGeo.ll[0]
    b.longitude = peerGeo.ll[1]

    var splitClientId = hello.clientId.split('/')
    b.clientMeta1 = splitClientId[0]
    b.clientMeta2 = splitClientId[1]
    b.clientMeta3 = splitClientId[2]
    b.clientMeta4 = splitClientId[3]

    const eth = peer.getProtocols()[0]
    eth.sendStatus(myStatus)
    eth.once('status', (peerStatus) => {
        debug(`Received status ${peer._socket.remoteAddress}`)
        b.bestHash = '0x' + peerStatus.bestHash.toString('hex')
        b.totalDifficulty = peerStatus.td.toString('hex')
        web3.eth.getBlock(b.bestHash, false)
        .then((block) => {
          if (_.has(block, 'number')) {
            debug(`Received: ${block.number}`)
            b.bestBlockNumber = block.number
          }
          return web3.eth.getBlockNumber()
        })
        .then((infuraBlockNumber) => {
            debug(`Infura Block: ${infuraBlockNumber}`)
            b.infuraBlockNumber = infuraBlockNumber
            b.infuraDrift = Math.abs(b.infuraBlockNumber - b.bestBlockNumber) || 0
            debug(`Found Drift: ${b.infuraDrift}`)
            // db.on('error', console.error.bind(console, 'connection error:'))
            b.save().then((ethpeer) => {
              debug('Saved peer: ' + ethpeer.enode)
            })
        })
        .catch(function (err) {
            console.error(err)
        })
    })
})

rlpx.on('peer:removed', (peer) => {
  // console.log(peer.getDisconnectPrefix(peer._disconnectReason))
  const eth = peer.getProtocols()[0]
  eth.sendStatus(myStatus)
})

for (let bootnode of BOOTNODES) {
  debug(`Connecting to ${bootnode.address}`)
  dpt.bootstrap(bootnode).catch((err) => console.error(chalk.bold.red(err.stack || err)))
}

dpt.on('error', (err) => console.error(chalk.red(err.stack || err)))

dpt.on('peer:added', (peer) => {
  // const info = `(${peer.id.toString('hex')},${peer.address},${peer.udpPort},${peer.tcpPort})`
  // console.log(chalk.green(`New peer: ${info} (total: ${dpt.getPeers().length})`))
})

dpt.on('peer:removed', (peer) => {
  // console.log(chalk.yellow(`Remove peer: ${peer.id.toString('hex')} (total: ${dpt.getPeers().length})`))
})

function runIdle () {
}

function run () {
  setInterval(runIdle, 30000)
}

run()
