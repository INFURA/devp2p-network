# devp2p-network

Monitor and record metrics from the DevP2P network in MongoDB and visualize the data using the Metabase analytics tool.

<img width="800" alt="devp2p-network-screencap" src="https://user-images.githubusercontent.com/1383412/50279407-6c982e80-03fe-11e9-9156-09a6567dda06.png">

##### Prerequisites:
- Docker & Docker Compose
    - [OS X](https://docs.docker.com/docker-for-mac/install/#install-and-run-docker-for-mac)
    - [Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu)
    - [Windows](https://docs.docker.com/docker-for-windows/install)
- [NodeJS](https://nodejs.org/en/download)

##### Install the node dependencies
```npm install```

##### Instantiate the database and dashboard backend services
```docker-compose up --detach```

##### Run the DevP2P monitor
```npm start```

It will take a minute for the client to connect to DevP2P peers. Once it connects to the first peer it will save the node's info to MongoDB and you should be able to see data in your dashboard.

##### Browse the dashboard data via Metabase
```http://localhost:3000```

##### You will need to configure Metabase by creating a user account and adding the MongoDB connection info
```
First Name: [anything]
Last Name: [anything]
Email: [anything]
...
```

```
Database Info:
Hostname: pg
Port: 5432
Username: pguser
Password: 3th3r3um
Database Name: devp2p
```
