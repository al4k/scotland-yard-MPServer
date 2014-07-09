// server_state.js
// ---------------
"use strict";

var events = require('events');
var util = require('util');



/**
 * Initialises the state of the server. This will be done only once
 * when the server is turned on
 * @constructor
 * @class
 * @property {int} ServerState.IDLE - The flag that represents the 'idle' state 
 * @property {int} ServerState.INITIALISED - The flag that represents the 'initialised' state
 * @property {int} ServerState.RUNNING - The flag that represents the 'running' state
 * @property {int} ServerState.GAME_OVER - The flag that represents the 'gane_over' state
 * @property {int} state - The current state of the game
 * @property {int} files_id - The id of the files being used for the game
 * @property {int} sessions_id - The id of the sessions being used for the game
 */
function ServerState()
{
	this.IDLE = 0;
	this.INITIALISED = 1;
	this.RUNNING = 2;
	this.GAME_OVER = 3;
	this.state = this.IDLE;
	this.files_id = 0;
	this.session_id = 0;
	this.client_handler = null;
}
util.inherits(ServerState, events.EventEmitter);

/**
 * Function to set the client handler
 */
ServerState.prototype.setClientHandler = function(handler)
{
	this.client_handler = handler;
}

ServerState.prototype.getState = function()
{
	return this.state;
}


/**
 * Resets the state of the game and sets the files_id and 
 * session_id properties to zero
 */
ServerState.prototype.reset = function()
{
	this.state = this.IDLE;
	this.files_id = 0;
	this.session_id = 0;
}

/**
 * Prints out the current state of the game
 */
ServerState.prototype.printState = function()
{
	console.log("State: " + this.state);
}

/**
 * main function for processing incoming requests from the clients. All
 * requests are routed through this function. It does suitable set of 
 * checks on the request to make sure they are valid and then emits a
 * response based on the request. Actions should be triggered by 
 * assigning callbacks to be triggered on the various emitions. 
 *	@param {Client} client A valid client object
 *	@param {string} request The request string that has been passed in by
 *	the client
 *	@tutorial protocol Definition of the protocol used by the server and
 *	client to communicate
 */
ServerState.prototype.processRequest = function(client, request)
{
	events.EventEmitter.call(this);

	// check the request against the stae of the game to check
	// if it is valid
	if(request.length == 0)
	{
		this.sendInvalid(client, REQUEST_IS_NOT_VALID, 'Request Is Not a Valid String');
		return;
	}

	if(request.search("\n"))
		request = request.replace("\n","");


	var request_parts = request.split(',');
	var client_id = request_parts[0];
	var action = request_parts[1];

	if(action != "next_player" && action != "game_over")
		console.log("[Request]: " + request);



	// do we need to join the client
	if(!this.joinClient(client_id, client, action))
		return;



	// do the look up on the action
	if(action == "initialise") this.initialiseCall(client_id, request_parts);
	else if (action == "get_file") this.getCall(client_id, request_parts);
	else if (action == "move") this.moveCall(client_id, request_parts);
	else if (action == "join") this.joinCall(client_id, request_parts);
	else if (action == "next_player") this.nextPlayerCall(client_id, request_parts);
	else if (action == "game_over") this.gameOverCall(client_id, request_parts);
	else if (action == "winning_player") this.winningPlayerCall(client_id, request_parts);
	else if (action == "reset") this.resetCall(client_id, request_parts);
	else if (action == "turn_over") this.turnOverCall(client_id, request_parts);
}


ServerState.prototype.turnOverCall = function(client_id, request_parts)
{
	var client = this.client_handler.getClient(client_id);
	var player_id = request_parts[2];


	this.emit('turn_over', client_id, player_id);
}


/**
 * Function to see if a new client is joining
 */
ServerState.prototype.joinClient = function(client_id, client, action)
{
	// check if the client is recognised
	if(!this.clientExpected(client_id))
	{
		client.write("Your Client ID " + client_id + " is not recognised as part of this game\n");
		return false;
	}

	// check if they are trying to join the game
	if(action == "join")
	{
		if(!this.client_handler.clientAlreadyAdded(client_id))
		{
			this.client_handler.addClient(client, client_id);
		}
	}

	return true;
}

/**
 * Function to check if the client is expectd
 */
ServerState.prototype.clientExpected = function(id)
{
	if(this.client_handler.expectsClient(id))
		return true;
	else
		return false;	
}


/**
 * Function to process the winning player request from a client. This function
 * checks that there is a game over state. If there is it will emit
 * the winning player event
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#winning_player
 */
ServerState.prototype.winningPlayerCall = function(client_id, request_parts)
{
	var client = this.client_handler.getClient(client_id);

	if(this.state != this.GAME_OVER)
	{
		client.write('1,0,Game is not over\n');
		return;
	}

	/**
	 * Winning Player event. This event is fired when a valid 'winning_player' request has been
	 * passed to the server
	 * @event ServerState#winning_player
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 */
	this.emit('winning_player', client_id);

}

/**
 * Function to process a reset call from the client. This must first
 * check the stae of the game to ensure that it is resetable. If
 * it is then the 'reset' event is emited
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#reset
 */
ServerState.prototype.resetCall = function(client_id, request_parts)
{
	var client  = this.client_handler.getClient(client_id);
	if(this.state == this.IDLE)
	{
		client.write('1,0,Game Not Running\n');
		return;
	}

	/**
	 * Reset event. This event is fired when a valid reset request has been
	 * passed to the server
	 * @event ServerState#reset
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 */
	this.emit("reset", client_id);
}

/**
 * Function that is called when the client requests 'game_over' comes in. This
 * function checks that the game is running. If it is it fires of the 
 * 'game_over' event
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#game_over
 */
ServerState.prototype.gameOverCall = function(client_id, request_parts)
{
	var client = this.client_handler.getClient(client_id);

	/**
	 * Game Over event. This event is fired when a valid game_over request has been
	 * passed to the server
	 * @event ServerState#game_over
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 */
	this.emit("game_over", client_id);
}


/**
 * Function that is called when the client makes the 'next_player' request. This function
 * checks that there is a game running. If it is running the 'next_player' event is fired
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#next_player
 */
ServerState.prototype.nextPlayerCall = function(client_id, request_parts)
{
	
	var client = this.client_handler.getClient(client_id);

	if(this.state != this.RUNNING)
	{
		client.write('1,0,Game Is Not in Progress\n');
		return;
	}


	/**
	 * Next Player event. This event is fired when a valid next_player request has been
	 * passed to the server
	 * @event ServerState#game_over
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 */
	this.emit("next_player", client_id);
}

/**
 * Function that is called when the client makes a 'move' request. This function
 * should check that there is a game running. If if is, it should check the 
 * construction of the request to make sure that it matches the expected format: 
 * 'move,player_id,target_id,ticket'. If it does the components of the move
 * should be split up and placed in an object that is fired with a 'move' event.
 * See the signature of the 'move' event to see this object composition
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#move
 */
ServerState.prototype.moveCall = function(client_id, request_parts)
{
	var client = this.client_handler.getClient(client_id);

	// check that the game is in process
	if(this.state != this.RUNNING)
	{
		client.write('1,0,Game Is Not in Progress\n');
		return;
	}


	// check that the correct number of parts
	if(request_parts.length != 5)
	{
		this.sendInvalid(client, -1, "Move request is not recognised");
		return;
	}



	// create the args and emit the signal
	var args = {};
	args.player_id = parseInt(request_parts[2]);
	args.target = parseInt(request_parts[3]);
	args.ticket = request_parts[4];

	
	/**
	 * Move event. This event is fired when a valid next_player request has been
	 * passed to the server
	 * @event ServerState#move
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 * @param {move_args} args The 
	 */
	this.emit('move', client_id, args);

	/**
	 * Move player arguments object
	 * @typedef ServerState#move_args
	 * @type {object}
	 * @property {int} player_id The Players id
	 * @property {int} target The target id of the move
	 * @property {string} ticket The ticket type of the move
	 */
}



/**
 * This function is called when a 'join' request comes into the server
 * It checks that the current stae is initialised. If it is it
 * emits the 'join' event
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#join
 */
ServerState.prototype.joinCall = function(client_id, request_parts)
{

	var client = this.client_handler.getClient(client_id);
	
	if(this.state != this.INITIALISED)
	{
		client.write('1,0,Game is not in the initialised state\n')	
		return;
	}

	/**
	 * Join event. This event is fired when a valid join request has been
	 * passed to the server
	 * @event ServerState#join
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 */
	this.emit('join', client_id);
	return;
}




/**
 * Function that is called when a get event is recieved by the server. It first checks 
 * that the server is in initialised state. If it is initialised it checks 
 * that the type of get matches the list of possible items (map,pos,game,graph). If
 * it finds a match, it creates an object of the information and emits it with a
 * 'get' event
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#get
 */
ServerState.prototype.getCall = function(client_id, request_parts)
{
	// get the client
	var client = this.client_handler.getClient(client_id);

	/*
	// check that the request is valid
	if(this.state != this.INITIALISED) 
	{
		client.write('0,0,Game is not in the initialised state\n');
		return;
	}

	*/

	// check that the type of thing being requested is ok
	var possible_gets = ['map','pos','game','graph'];
	var request_item = request_parts[2];
	for(var i = 0; i < possible_gets.length; i++)
	{
		if(request_item == possible_gets[i]) 
		{
			// build the arguments object
			var args = {}
			args.request = request_parts[1];
			args.item = request_parts[2];
			args.session_id = this.session_id;
			args.files_id = this.files_id;


			/**
			 * Get event. This event is fired when a valid get request has been
			 * passed to the server
			 * @event ServerState#get
			 * @type {function}
			 * @param {Client} client The client object that made the request
			 * @param {object} args The information needed to process the get request
			 */
			this.emit('get_file',client_id, args);
			return;
		}	
	}


	// if its not found call and error event
	this.sendInvalid(client, -1,'Get Item is Not one of: ' + possible_gets);
	return;

}



/**
 * Function to process an 'initialise' request from the client. Its first action
 * is to check that the state is idle. If so it checks that the request 
 * is in a valid format. If the format is ok, the request is split up and 
 * put into an object that is emited with the 'initialise' event
 * @param {Client} client The client object that made the request
 * @param {string_list} request_parts The request line split by comma
 * @fires ServerState#initialise
 */
ServerState.prototype.initialiseCall = function(client_id, request_parts)
{

	// get the client and check it
	var client = this.client_handler.getClient(client_id);
	if(client == null)
		return;


	if(!this.client_handler.canInitialise(client_id))
	{
		client.write("1,-1,Your client cannot initialise game\n");
		return;
	}


	if(this.state != this.IDLE)
	{
		client.write("1,0,Game Not Idle\n");
		return;
	}
	
	// the state is correct for the request, check the arguments are ok
	if(request_parts.length < 4) 
	{
		this.sendInvalid(client, REQUEST_INITIALISE_IS_INCOMPLETE,
				"Request Incomplete. Expecting [intialise,num_players,session_name,files_id]");
		return;
	}

	var args = {};
	args.request = request_parts[0];
	args.num_players = parseInt(request_parts[1]);
	args.session_name = request_parts[2];
	args.files_id = parseInt(request_parts[3]);

	// we are now ok to emit the initialise event
	/**
	 * Initialised event. This event is fired when a valid initialise request has been
	 * passed to the server
	 * @event ServerState#initialise
	 * @type {function}
	 * @param {Client} client The client object that made the request
	 * @param {object} args The information needed to process the initialise request
	 */
	this.emit('initialise', this.client_handler.getClient(client_id), args);
	return;
}

/**
 * Function that processes invalid requests. If an invalid request is 
 * detected this function will emit the 'invalid_request' event and pass with it 
 * information about the error
 * @param {Client} client The client object that made the request
 * @param {int} code An error code
 * @param {string} reason The reason for the error
 * @files ServerState#invalid_request
 */
ServerState.prototype.sendInvalid = function(client, code, reason)
{
	var err = {'message': reason, 'code' : code}
	/**
	 * Event that is triggered by an invalid request
	 * @event ServerState#invalid_request
	 * @type{function}
	 * @param {Client} client The client object that made the request
	 * @param {object} err An error object containing the error code and the reason
	 */
	this.emit('invalid_request', client, err);
}



ServerState.prototype.setSessionId = function(id)
{
	this.session_id = id;
}

ServerState.prototype.setFilesId = function(id)
{
	this.files_id = id;
}

ServerState.prototype.getSessionId = function(id)
{
	return this.session_id;
}

ServerState.prototype.getFilesId = function(id)
{
	return this.files_id;
}

ServerState.prototype.setState = function(state)
{
	this.state = state;
}


module.exports = ServerState;

