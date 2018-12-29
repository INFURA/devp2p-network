const _ = require('lodash')
const Sequelize = require('sequelize')
const debug = require('debug')('infura:db')

const EthPeerSchema = {
  address: { type: Sequelize.STRING, primary_key: true },
  bestBlockNumber: {type: Sequelize.INTEGER(11).UNSIGNED, default: 0},
  bestHash: { type: Sequelize.STRING },
  capabilities: { type: Sequelize.ARRAY(Sequelize.STRING) },
  clientId:{type: Sequelize.STRING, index: true},
  clientMeta1:{type: Sequelize.STRING, index: true},
  clientMeta2:{type: Sequelize.STRING, index: true},
  clientMeta3:{type: Sequelize.STRING, index: true},
  clientMeta4:{type: Sequelize.STRING, index: true},
  country: {type: Sequelize.STRING },
  enode: {type: Sequelize.STRING, unique: true},
  infuraBlockNumber: {type: Sequelize.INTEGER(11).UNSIGNED, default: 0},
  infuraDrift: {type: Sequelize.INTEGER(11), default: 0},
  latitude: {type: Sequelize.FLOAT },
  longitude: {type: Sequelize.FLOAT },
  numPeers: {type: Sequelize.INTEGER(11).UNSIGNED, default: 0},
  port: {type: Sequelize.INTEGER(11).UNSIGNED},
  timestamp:{type: Sequelize.DATE, index: true},
  totalDifficulty: {type: Sequelize.STRING},
}

module.exports = (opts) => {
  const options = _.defaults(opts || {}, {
    dbUser: 'pguser',
    dbPass: '3th3r3um',
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'devp2p'
  })
  const {dbUser, dbPass, dbHost, dbName} = options
  const conn = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    dialect: 'postgres',
    operatorAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  conn.authenticate()
    .then(() => {
      debug('DB Connected...')
    })
    .catch((err) => {
      console.error('Unable to connect to the database:', err);
    })

  const EthPeer = conn.define('peers', EthPeerSchema, {
    indexes: [
      {
        fields: ['bestBlockNumber'],
        method: 'BTREE'
      },
      {
        fields: ['enode'],
        unique: true
      },
      {
        fields: ['infuraBlockNumber'],
        method: 'BTREE'
      },
      {
        fields: ['infuraDrift'],
        method: 'BTREE'
      },
      { fields: ['timestamp'],
        method: 'BTREE'
      }
    ]
  })

  EthPeer.sync().then(() => {
    debug('EthPeers table created')
  })
    const getConnection = () => { return conn }
  return { EthPeer, getConnection }
}
