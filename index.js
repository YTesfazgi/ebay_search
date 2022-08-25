// ESM
import 'dotenv/config'
import Fastify from 'fastify'
import fetch from "node-fetch"
import fs from 'fs'
const fastify = Fastify({
  logger: true
})
import fastifyFormbody from '@fastify/formbody'
fastify.register(fastifyFormbody)

import FastifyView from '@fastify/view'
import Handlebars from 'handlebars'

fastify.register(FastifyView, {
  engine: {
    handlebars: Handlebars,
  },
});

// runs home page
const indexHtml = fs.readFileSync('./index.html', 'utf8');

// OAuth Credentials
let clientId = process.env.CLIENT_ID
let clientSecret = process.env.CLIENT_SECRET
let oauthEndpoint = 'https://api.ebay.com/identity/v1/oauth2/token'
let base64String = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

// generating body for HTTP request to OAuth Endpoint
const params = new URLSearchParams();
params.append('grant_type','client_credentials');
params.append('scope','https://api.ebay.com/oauth/api_scope')

// this handles get requests
fastify.get('/', function (request, reply) {
  reply.type("text/html")
  reply.send(indexHtml)
})

fastify.get('/search', (request, reply) => {
  
  var searchTerm = String(request.query.search_term);

  // executing HTTP request using fetch, then calling eBay API
  fetch(oauthEndpoint, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type':'application/x-www-form-urlencoded',
      'Authorization':`Basic ${base64String}`
    }
  }).then((response) => response.json())
    .then((json) => {
      var accessToken = json.access_token
      let ebaySearchUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${searchTerm}`

      fetch(ebaySearchUrl, {
        method: 'GET',
        headers: {
          'Authorization':`Bearer ${accessToken}`
        }
      })
      .then((ebaySearchResults) => ebaySearchResults.json())
      .then((json) => {
        reply.header('Content-Type', 'text/html')
        reply.view("./views/helloworld.hbs", { items: json.itemSummaries, searchTerm: searchTerm })
      })
    })
})

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})