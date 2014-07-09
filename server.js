// Description of the Server File
// ------------------------------
"use strict";

// The following module provides a set of helper functions that
// are needed to set up the game
var game_state_init = require("./game_state_init");
var port = 8124;
var net = require('net');
var server = null; 
var detectiveTimeLimit = 25000;
var mrXTimeLimit = 25000;

var ServerState = require('./server_state');
var server_state = new ServerState();
var game_running = false;
var GameState   = require('./game_state');
var game_state = new GameState();

// initialise the turn timer
var TurnTimer = require('./turn_timer');

var timer = new TurnTimer(mrXTimeLimit, skipPlayerTurn);





// Initialise the client handler
var ClientHandler = require('./client_handler');
var client_handler = new ClientHandler(process.argv[2]);


client_handler.on('set_up', setUpServer); 
client_handler.on('all_added', runGame);
client_handler.on('finished', function() {
	process.exit(0);
});
client_handler.loadFromFile(process.argv[2]);








// function to set up the server object
function setUpServer()
{
	server = net.createServer(connect);
	server.listen(port);
	console.log("[Message]: Server Ready and Listening on Port " + port);

	// set up the server state object
	setUpServerState();
}

// Function to set up the server state object and assign all the event listeners
function setUpServerState()
{
	server_state.on('invalid_request', onInvalid);
	server_state.on('get_file', onGet);
	server_state.on('join', onJoin);
	server_state.on('move', onMove);
	server_state.on('next_player', onNextPlayer);
	server_state.on('game_over', onGameOver);
	server_state.on('winning_player', onWinningPlayer);
	server_state.on('reset', onReset);
	server_state.on('turn_over', onTurnOver);

	// set the client handler
	server_state.setClientHandler(client_handler);
	console.log("[Message]: Server State Set Up and Ready");

	// server is set up, lets initialise the game
	initialiseGame(client_handler.getNumberOfDetectives());
}





// function that initialises the game
function initialiseGame(num_detectives)
{
	console.log("[Message]: Initialising Game");

	game_state_init.initialiseGame(num_detectives, function(err, output) {
		if(err) throw err;

		server_state.setSessionId(output.session_id);
		server_state.setFilesId(output.files_id);

		game_state.setGraph(output.graph);
		for(var i = 0; i < output.players.length; i++)
		{
			game_state.addPlayer(output.players[i]);
		}

		console.log("[Message]: Game Initialised");
		server_state.setState(server_state.INITIALISED);
		
	});
}

// function called when the client connects to the server
function connect(client) {
	client.setEncoding("utf8");
	client.name = client.remoteAddress + ":"+ client.remotePort;
	client.on('data', receive);
	client.on('end', removeClient);
	client.on('error', errorMessage);
	console.log("[Message]: Hello Client " + client.name);	
	function receive(request) { server_state.processRequest(client,request); }
	
	function removeClient(data)
	{
		client_handler.removeClient(client);
	}

	function errorMessage()
	{
		console.log("[Error] Error with one of the clients, possible early disconnect, quitting");
		process.exit(1);
	}

}



// Server State Event Callbacks
// ----------------------------


function runGame()
{
	if(!game_running)
	{
		console.log("[Message]: Players have joined, game ready to go!");
		server_state.setState(server_state.RUNNING);
		game_state.startRunning();


		// start the time
		if(game_state.getCurrentPlayer() == 0)
		{
			timer.start(mrXTimeLimit);
		}
		else
		{
			timer.start(detectiveTimeLimit);
		}
		game_running = true;
	}

}

function skipPlayerTurn()
{
	console.log("[Message]: Skipping Turn!");
	game_state.setTurnMissed();
	timer.stop();
	//game_s/tate.skipTurn();
	//timer.stop();
	//timer.start();

}

function onTurnOver(client_id, player_id)
{
	var client = client_handler.getClient(client_id);

	var current_player = game_state.getCurrentPlayer();
		

	// if it is not the current players turn
	if(player_id != current_player)
	{
		console.log("[Message]: Not Your Turn!");
		client.write('1,-1,Not Your Turn\n');
		return;
	}


	var time = timer.getTimeLeft() / 1000.0;

	client.write('1,' + time + '\n');
	return;
}


// This function is triggered when the `ServerState` gets an invalid
// request. It simply writes the error to the client
function onInvalid(client, err)
{
	client.write("0," + err.code + "," + err.message + "\n");
}

// This function is triggered when a  `winning_player` event is emitted
// by the `ServerState`. First, we must check the state of the game to
// see if it is finished. If it is, the winning player id must be retrieved
// from the games state and written to the client output
function onWinningPlayer(client_id)
{
	var client = client_handler.getClient(client_id);

	if(game_state.isGameOver())
	{
		var winning_player = game_state.getWinningPlayer();
		client.write('1,1,'+winning_player+'\n');
	}
	else
	{
		client.write('1,0\n');
	}
}

// This function is triggered when a `reset` event is emitted by the `ServerState`.
// This function needs to reset both the `GameState` and the `ServerState`
// and write a response to the client
function onReset(client)
{
	game_state.reset();
	server_state.reset();	
	client.write('1,1\n');
}


// This function is triggered when a `game_over` event is emitted by the
// `ServerState`. It must check the `GameState` to see if the game has finished.
// If it has, this is written to the client.
function onGameOver(client_id)
{
	var client = client_handler.getClient(client_id);
	var game_over = game_state.isGameOver();
	if(game_over) 
	{
		client.write( 1 + "," + 1 + "\n");
		server_state.setState(server_state.GAME_OVER);
		return;
	}
	else 
	{
		client.write( 1 + "," + 0 + "\n");
		return;
	}
}


// This funciton is triggered by a 'next_player' event emitted by the `ServerState`
// It must use the `GameState` to find out who the next player is and write it to 
// the client
function onNextPlayer(client_id)
{
	var client = client_handler.getClient(client_id);
	var next_player = game_state.getNextPlayer();
	client.write("1,1,"  + next_player + "\n");
	return;
}


// This function is triggered by a `move` event emitted from the `ServerState`. 
// It must first use the `GameState` to move the player using the `movePlayer(id,target_id,ticket)`
// function. If the function returns true, it must then use the `db_access` module to 
// write the moves to the database. This includes updating the player positions
// and ticket numbers, and adding a move into the move table. If the move is
// invalid with respect to the `GameState` this must be expressed to the client
function onMove(client_id, args)
{
	var client = client_handler.getClient(client_id);
	if(game_state.movePlayer(args.player_id,
			args.target, args.ticket))
	{
		console.log("[Message]: Move Is Good!");
        client.write("1,1\n");

		// valid move, set the timer for the next turn
		timer.stop();
		
		// start the time
		if(game_state.getCurrentPlayer() == 0)
		{
			timer.start(mrXTimeLimit);
		}
		else
		{
			timer.start(mrXTimeLimit);
		}
		


        return;
	}
	else
	{
		console.log("[Message]: Move is not OK!");
		client.write("1,0, Move Is Invalid\n");
	}
}





// Function triggered by a `join` event emitted from the `ServerState`. This
// function must use the game state to get the list of player ids. It then
// must parse this list into the format expected by the protocol and write it
// to the client. This function must also update the state of the `GameState` setting
// it to `initialised`
function onJoin(client_id, args)
{

	// get the player ids associated with this client
	var player_ids = client_handler.getPlayerIds(client_id);

	// generate the output
	var output = "";
	for(var i = 0; i < player_ids.length; i++)
	{
		output += player_ids[i] + ':';
	}

	output = output.substring(0, output.length-1);

	// get the client
	var client = client_handler.getClient(client_id);
	client.write(1 + "," + output + "\n");
}






// Function triggered on a `get` event triggered by the server. The 
// function checks for the type of the file to get and then calls the nessesary
// functions to ge the data. The data is then written to the client
// depending on the type of data (text or binary)
function onGet(client_id, args)
{
	var client = client_handler.getClient(client_id);

	if(args.item == "game")
	{
	   	game_state_init.getWholeGameState(args.session_id, game_state, function(data) {
			
			sendText(data);
			client_handler.setClientReady(client_id);
			client_handler.allClientsReady();
		});
	}
	else
	{
		// load the appropriate file
		var fs = require('fs');
		if(args.item == 'graph')
		{
			fs.readFile('resources/graph.txt', 'utf8', function(err,data) {
				if(err) throw err;
				sendText(data);
			});
		}
		
		if(args.item == 'pos')
		{
			fs.readFile('resources/pos.txt', 'utf8', function(err,data) {
				if(err) throw err;
				sendText(data);
			});
		}

		if(args.item == 'map')
		{
			fs.readFile('resources/images/map.jpg', function(err, data) {
				if(err) throw err;
				sendBinary(data, function() {
				});
			});
		}
	}


	function sendText(dump)
	{
		client.write('1,'+dump.length+'\n');
		client.write(dump);
		/*
		// split the dump int chunks
		var chunkSize = 1024;
		var chunks = [];

		while(dump.length > 0)
		{
			if(dump.length < chunkSize)
			{
				chunks.push(dump);
				break;
			}
			else
			{
				chunks.push(dump.substr(0, chunkSize));
				dump = dump.substr(chunkSize);
				console.log(dump);
			}
		}

		console.log(chunks);
		//process.exit(0);
		
		var info_string = '1,'+chunks.length;
		for(var i = 0; i < chunks.length; i++)
		{
			info_string += ',' + chunks[i].length;
		}


		var chunksSent = 0;
		var chunk_to_send = 0;

		console.log(info_string);
		client.write(info_string+ "\n", sendChunk);


		


		function sendChunk()
		{
			client.write(chunks[chunk_to_send], function() {
				console.log("[Message]: Finished Writing Chunk " + chunk_to_send);
				chunk_to_send++;
				if(chunk_to_send >= chunks.length)
					return;
				else
					sendChunk();
			});

		}
*/
	}

	function sendBinary(dump, call)
	{
		var buf = new Buffer(dump);
		client.write('1,'+buf.length + "\n");
		client.write(buf, function() {
			return call();
		});
	}
}




