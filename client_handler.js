// client_handler.js
// -----------------
"use strict";

var fs = require('fs');
var events = require('events');
var util = require('util');

// -----------------------------------------------------------------------------
// constructor
function ClientHandler()
{
	this.num_clients = 0;
	this.num_detectives = 0;
	this.client_ids = [];
	this.mrx_id = 0;
	this.detective_ids = [];
	this.client_data = {};
	this.clients_added = 0;

}
util.inherits(ClientHandler, events.EventEmitter);


// -----------------------------------------------------------------------------
// Get the number of detectives
ClientHandler.prototype.getNumberOfDetectives = function()
{
	return this.num_detectives;
}

// -----------------------------------------------------------------------------
// Function to initialise the object from a file
ClientHandler.prototype.loadFromFile = function(file_path)
{
	// load the json file
	var data = fs.readFileSync(file_path, 'utf8');
	var obj = JSON.parse(data);
	this.setUpClientHandler(obj.expected_ids, obj.num_detectives);
	console.log("[Message]: Client Handler Ready");
	this.emit('set_up', this);
}


// -----------------------------------------------------------------------------
ClientHandler.prototype.removeClient = function(client)
{
	for(var prop in this.client_data)
	{
		if(client == this.client_data[prop].client)
		{
			console.log("[Message]: Removing Client " + prop);
			this.client_data[prop].client = null;
			this.clients_added--;
		}
	}

	if(this.clients_added == 0)
		this.emit('finished');
}


// -----------------------------------------------------------------------------
ClientHandler.prototype.getPlayerIds = function(client_id)
{
	if(this.expectsClient(client_id))
	{
		return this.client_data[client_id].ids;
	}
	else
	{
		return [];
	}
}

// -----------------------------------------------------------------------------
// Function to check if a client can initialise the game
ClientHandler.prototype.canInitialise = function(id)
{
	if(id == this.mrx_id)
		return true;
	else
		return false;
}

// -----------------------------------------------------------------------------
// Function to set up the client handler
ClientHandler.prototype.setUpClientHandler = function(client_ids, num_detectives)
{
	this.num_clients = client_ids.length;
	this.num_detectives = num_detectives;
	this.client_ids = client_ids;

	if(this.num_clients > this.num_detectives)
	{
		console.log("[Error]: Too many clients for the number of detectives, exiting");
		process.exit();
	}


	// create the detective ids
	this.mrx_id        = 0;
	this.detective_ids = [];
	for(var i = 1; i <= this.num_detectives; i++)
	{
		this.detective_ids.push(i);
	}
	
	if(num_detectives > 2)
	{
		this.detective_ids[1] = 3;
		this.detective_ids[2] = 2;
	}


	// assign the ids to the players
	this.client_data = {};
	this.client_data[0] = {client : null, ids : [this.mrx_id], ready : false};
	var avg = this.num_detectives / this.num_clients;
	var last = 0.0;

	var id_count = 0;
	while(last < this.num_detectives)
	{
		var s = this.detective_ids.slice(Math.floor(last),Math.floor(last+avg));
		this.client_data[client_ids[id_count]] = { client: null, ids : s, ready : false };

		last += avg;
		id_count++;
	}
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.expectsClient = function(client_id)
{
	for(var i = 0; i < this.client_ids.length; i++)
	{
		if(this.client_ids[i] == client_id) 
			return true;
	}

	if(client_id == this.mrx_id)
		return true;

	return false;
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.isMr


// -----------------------------------------------------------------------------
ClientHandler.prototype.getPlayerIDs = function(client_id)
{
	if(this.expectsClient(client_id))
		return this.client_data[client_id].ids;

	return [];
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.allClientsAdded = function()
{
	for(var i = 0; i < this.client_ids.length; i++)
	{
		if(!this.clientAlreadyAdded(this.client_ids[i]))
			return false;
	}
	return true;
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.allClientsReady  = function()
{
	if(!this.client_data[this.mrx_id].ready)
		return false;


	for(var i = 0; i < this.client_ids.length; i++)
	{
		if(!this.client_data[this.client_ids[i]].ready)
			return false;
	}

	// emit the event
	this.emit('all_added');
	return true;
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.setClientReady = function(client_id)
{
	this.client_data[client_id].ready = true;
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.addClient = function(client, id)
{
	if(!this.expectsClient(id))
		return false;

	// check if client already exists
	if(this.clientAlreadyAdded(id))
		return false;


	this.client_data[id].client = client;
	this.clients_added++;


	// check if all the clients have been added
	if(this.allClientsAdded())
	{
	}

	return true;
}




// -----------------------------------------------------------------------------
ClientHandler.prototype.clientAlreadyAdded = function(id)
{
	if(this.client_data[id].client != null)
	{
		return true;
	}
	else
	{
		return false;
	}
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.writeToClients = function(message)
{
	for(var i = 0; i < this.client_ids.length; i++)
	{
		this.writeToClient(this.client_ids[i], message);
	}
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.writeToClient = function(id, message)
{
	if(!this.expectsClient(id))
		return;
	this.client_data[id].client.write(message);
}

// -----------------------------------------------------------------------------
ClientHandler.prototype.getClient = function(client_id)
{
	if(!this.clientAlreadyAdded(client_id))
		return null;
	else
		//this.client_data[client_id].client.write("Fucked\n");
		return this.client_data[client_id].client;
}

module.exports = ClientHandler;
