// ESM
import 'dotenv/config'
import Fastify from 'fastify'
import fetch from "node-fetch"
import fs from 'fs';

import fastifyFormbody from '@fastify/formbody';
import FastifyView from '@fastify/view'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import Handlebars from 'handlebars'

const fastify = Fastify({
  logger: true
});

fastify.register(fastifyFormbody);
fastify.register(FastifyView, {
  engine: {
    handlebars: Handlebars,
  },
});
fastify.register(fastifyCookie, {
  secret: "my-secret-cookie-signature", // for cookies signature
  parseOptions: {}     // options for parsing cookies
});
fastify.register(fastifySession, {secret: 'a secret with minimum length of 32 characters'});
fastify.addHook('preHandler', (request, reply, next) => {
  request.session.user = {name: 'max'};
  next();
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
  reply.header('Content-Type', 'text/html')
  reply.view("./views/homepage.hbs", { searchTerm: request.cookies.searchTerm
  })
})

fastify.get('/search', (request, reply) => {
  
  var searchTerm = String(request.query.search_term);

  reply.cookie('searchTerm', request.query.search_term);

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