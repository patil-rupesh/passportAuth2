# node-mongodb-oauth2-server-sample
oauth2 example use oauth2-server module

* prepare data
```
$ mongo
> use auth
> db.oauthclients.insert({"clientId" : "client1", "clientSecret" : "secret1", "redirectUri" : "http://localhost:4000/auth/example/callback"})
> db.oauthusers.insert({"username" : "tom", "password" : "password1", "firstname" : "tom", "lastname" : "cat", "email" : "tom@cat.com" })
```

* launch client
```
$ cd client
$ npm install
$ node index.js
```
* launch oauth provider
```
$ cd server
$ npm install
$ node index.js
```

* open browser and go to http://localhost:4000/auth/example, and then login with tom/password1

