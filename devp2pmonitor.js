const chalk = require('chalk')
const os = require('os')
const Buffer = require('safe-buffer').Buffer
const { EventEmitter } = require('events')
const secp256k1 = require('secp256k1')
const { randomBytes } = require('crypto')
const createDebugLogger = require('debug')
const ms = require('ms')
const devp2p = require('ethereumjs-devp2p')
const KBucket = require('ethereumjs-devp2p').KBucket
const BanList = require('ethereumjs-devp2p').BanList
const DPT = require('ethereumjs-devp2p').DPT
const ETH = require('ethereumjs-devp2p').ETH
const geoip = require('geoip-lite')
const Web3 = require('web3')
const web3 = new Web3()
const debug = createDebugLogger('devp2p:dpt')

const mongoose = require('mongoose')

const web3Url = 'https://mainnet.infura.io/devp2p-network-research'
web3.setProvider(new web3.providers.HttpProvider(web3Url))

// Connection URL
const url = 'mongodb://localhost:27017'
var db = mongoose.connection

var Schema = mongoose.Schema
const peerSchema = new Schema({
  enode: {type: String, index: true, unique: true},
  address:{type: String, index: true},
  latitude: Number,
  longitude: Number,
  country: String,
  port: Number,
  clientId:{type: String, index: true},
  clientMeta1:{type: String, index: true},
  clientMeta2:{type: String, index: true},
  clientMeta3:{type: String, index: true},
  clientMeta4:{type: String, index: true},
  capabilities: Array,
  bestHash: String,
  totalDifficulty: String,
  bestBlockNumber: {type: Number, index: true, default: 0},
  infuraBlockNumber: {type: Number, index: true, default: 0},
  infuraDrift: {type: Number, index: true, default: 0},
  numPeers: {type: Number, default: 0},
  timestamp:{type: Date, index: true}
})

var EthPeer = mongoose.model('Peer', peerSchema)

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
const dpt = new DPT(Buffer.from(PRIVATE_KEY, 'hex'), {
  endpoint: {
    address: '0.0.0.0',
    udpPort: null,
    tcpPort: null
  }
})
// RLPx
const rlpx = new devp2p.RLPx(PRIVATE_KEY, {
  dpt: dpt,
  clientId: `ethereumjs-devp2p/v2.5.0-research/${os.platform()}-${os.arch()}/nodejs`,
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
    var hello = peer.getHelloMessage()
    var b = new EthPeer()
    b.enode = hello.id.toString('hex')
    b.address = peer._socket.remoteAddress
    b.port = peer._socket.remotePort
    var peerGeo = geoip.lookup(b.address)
    if ((typeof peerGeo !== 'undefined') && (peerGeo !== null) && (typeof peerGeo.ll !== 'undefined') && (typeof peerGeo.ll.country !== 'undefined')) {
        b.country = peerGeo.ll.country
    }
    if ((typeof peerGeo !== 'undefined') && (peerGeo !== null) && (peerGeo.city !== 'undefined') && (peerGeo.city != null)) {
        b.city = peerGeo.city
    }
    b.latitude = peerGeo.ll[0]
    b.longitude = peerGeo.ll[1]
    b.clientId = hello.clientId
    var splitClientId = hello.clientId.split('/')
    b.clientMeta1 = splitClientId[0]
    b.clientMeta2 = splitClientId[1]
    b.clientMeta3 = splitClientId[2]
    b.clientMeta4 = splitClientId[3]
    b.capabilities = hello.capabilities
    b.timestamp = new Date()
    const eth = peer.getProtocols()[0]
    eth.sendStatus(myStatus)
    eth.once('status', (peerStatus) => {
        //console.log('received STATUS')
        b.bestHash = '0x' + peerStatus.bestHash.toString('hex')
        b.totalDifficulty = peerStatus.td.toString('hex')
        web3.eth.getBlock(b.bestHash, false)
        .then(function(block) {
            b.bestBlockNumber = block.number
            web3.eth.getBlockNumber()
                .then(function (infuraBlockNumber) {
                    b.infuraBlockNumber = infuraBlockNumber
                    b.infuraDrift = Math.abs(b.infuraBlockNumber - b.bestBlockNumber)
                    mongoose.connect('mongodb://localhost/devp2p')
                    db.on('error', console.error.bind(console, 'connection error:'))
                    db.once('open', function() {
                      b.save()
                      console.log('Saved peer: ' + b.enode)
                    })
                    .catch(function (err) {
                        console.error(err)
                    })

                })
                .catch(function (err) {
                    console.log(err)
                })
        })
        .catch(function(err) {
            console.log(err)
        })
    })
})

rlpx.on('peer:removed', (peer) => {
    //console.log(peer.getDisconnectPrefix(peer._disconnectReason))
    const eth = peer.getProtocols()[0]
    eth.sendStatus(myStatus)
})

var knownPeers = {}

for (let bootnode of BOOTNODES) {
  dpt.bootstrap(bootnode).catch((err) => console.error(chalk.bold.red(err.stack || err)))
}

dpt.on('error', (err) => console.error(chalk.red(err.stack || err)))

dpt.on('peer:added', (peer) => {
  //const info = `(${peer.id.toString('hex')},${peer.address},${peer.udpPort},${peer.tcpPort})`
  //console.log(chalk.green(`New peer: ${info} (total: ${dpt.getPeers().length})`))
})

dpt.on('peer:removed', (peer) => {
  //console.log(chalk.yellow(`Remove peer: ${peer.id.toString('hex')} (total: ${dpt.getPeers().length})`))
})

function runIdle() {
}

function run() {
  setInterval(runIdle, 30000)
}

run()
