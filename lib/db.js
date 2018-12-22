const mongoose = require('mongoose')
const _ = require('lodash')
const debug = require('debug')('infura:db')

const Schema = mongoose.Schema
const EthPeerSchema = new Schema({
  address:{type: String, index: true},
  bestBlockNumber: {type: Number, index: true, default: 0},
  bestHash: String,
  capabilities: Array,
  clientId:{type: String, index: true},
  clientMeta1:{type: String, index: true},
  clientMeta2:{type: String, index: true},
  clientMeta3:{type: String, index: true},
  clientMeta4:{type: String, index: true},
  country: String,
  enode: {type: String, index: true, unique: true},
  infuraBlockNumber: {type: Number, index: true, default: 0},
  infuraDrift: {type: Number, index: true, default: 0},
  latitude: Number,
  longitude: Number,
  numPeers: {type: Number, default: 0},
  port: Number,
  timestamp:{type: Date, index: true},
  totalDifficulty: String,
})

module.exports = (opts) => {
  const options = _.defaults(opts || {}, {
    dbUri: 'mongodb://localhost:27017',
    dbName: 'devp2p'
  })

  // Connect to the database
  const connectionUri = `${options.dbUri}/${options.dbName}`
  debug(`Connecting to ${connectionUri}`)
  const conn = mongoose.createConnection(connectionUri, {useNewUrlParser: true})
  conn.on('error', (err) => { console.error(err) })
  conn.then(
    () => { debug('DB Connected...')},
    (err) => { debug(`DB Connection Error: ${err}`)}
  )

  // Connect the models
  const EthPeer = conn.model('Peer', EthPeerSchema)

  const getConnection = () => { return conn }
  return { EthPeer, getConnection }
}
