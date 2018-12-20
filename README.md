# devp2p-network

Monitor and record metrics from the DevP2P network in MongoDB and visualize the data using the Metabase analytics tool.

##### Prerequisites:
- Docker & Docker Compose
- NodeJS

##### Install the node dependencies
```npm install```

##### Instantiate the database and dashboard backend services
```docker-compose up --detach```

##### Run the DevP2P monitor
```node app.js```

It will take a minute for the client to connect to DevP2P peers. Once it connects to the first peer it will save the node's info to MongoDB and you should be able to see data in your dashboard.

##### Browse the dashboard data via Metabase
```http://localhost:3000```

##### You will need to configure Metabase by creating a user account and adding the MongoDB connection info
```
First Name: [anything]
Last Name: [anything]
Email: [anything]
```


```
Database Info:
Hostname: mongo
Port: 27017
Database Name: devp2p
```