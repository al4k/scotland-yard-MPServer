// game_state.js
// -------------
"use strict";
var Graph = require("./graph");
var Player = require("./player");

var MR_X_MAX_TURNS = 24;

/**
 * Initialises the GameState object. This needs to be done when the 
 * server starts running. 
 * @contructor
 * @class
 */
function GameState()
{
	this.static_players = [];
	this.players = [];
	this.x_ids = [];
	this.d_ids = [];
	this.player_ids = [];
	this.graph = null;
	this.using_double_move = false;
	this.using_secret_move = false;
	this.double_move_turns = 0;
	this.is_game_over  = false;
	this.current_player;

	this.all_moves = [];
	this.player_history = {};
}

/**
 * Function to reset the game state object. Is does exactly the
 * same as the constructor without creating a new object
 */
GameState.prototype.reset = function()
{
	this.static_players = [];
	this.players = [];
	this.x_ids = [];
	this.d_ids = [];
	this.player_ids = [];
	this.graph = null;
	this.using_double_move = false;
	this.using_secret_move = false;
	this.double_move_turns = 0;
	this.is_game_over  = false;
	this.current_player = 0;


	this.all_moves = [];
	this.player_history = {};
}


GameState.prototype.skipTurn = function()
{
	var player = this.getPlayer(this.current_player);
	//layer.skipTurn();

	// get a random move
	var moves = this.getPossibleMoves(player.location_id);

	// shuffle the moves
	for(var i = moves.length - 1; i > 0; i--)
	{
		var j = Math.floor(Math.random() *(i+1));
		var temp = moves[i];
		moves[i] = moves[j];
		moves[j] = temp;
	}

	// use the first move that is possible
	for(var i = 0; i < moves.length; i++)
	{
		if(this.moveIsPossible(player, moves[i].id, moves[i].type));
		{
			this.movePlayer(this.current_player, moves[i].id, moves[i].type);
			return;
		}
	}
}


GameState.prototype.getCurrentPlayer = function()
{
	return this.current_player;
}

/**
 * Move player function. This is equivalent to the move player
 * function on the Java GameState class. It will check to see
 * if the move is valid, if it is valid the function
 * will make the move and handle the tickets. The current player
 * id will be moved to the next player. At the end of the turn, 
 * the game state will evaluate if that turn has resulted in a gmae over state
 * If it has the is_game_over flag is set to true
 * @param {int} id The id of the player making the move
 * @param {int} target The id of the node that the player should move to
 * @param {string} ticket The type of ticket that the player is using to make the move
 * @return {boolean} If the move was succesful or not
 */
GameState.prototype.movePlayer = function(id, target, ticket)
{

	// basic sense checks
	if(id != this.current_player) return false;
	if(!this.playerExists(id)) return false;

	if(ticket == "DoubleMove")
	{
		// cant use a double move whilst in double move mode
		if(this.using_double_move) return true;


		this.using_double_move = true;
		this.double_move_turns = 0;
		
		// remove the double move ticket
		this.getMrX().useTicket("DoubleMove");

		return true;
	}


	var player = this.getPlayer(id);
	var previous = player.location_id;

	var move = {};
	move.previous = previous;
	move.target = target;
	move.ticket = ticket;
	move.id = id;

	var moveOk = this.doMove(id, target, ticket);
	if(moveOk)
		this.all_moves.push(move);

	this.evaluateGameOver();


	return moveOk;

}


GameState.prototype.getMoves = function()
{
	return this.all_moves;
}

/**
 * Function to check if the game is in a game over state
 * @return {boolean} If the game is over
 */
GameState.prototype.isGameOver = function()
{
	return this.is_game_over;
}


GameState.prototype.setTurnMissed = function()
{
	// game is over
	this.is_game_over = true;

	// set the winning player
	if(this.isMrX(this.current_player))
	{
		this.winning_player = this.d_ids[0];
	}
	else
	{
		this.winning_player = this.x_ids[0];
	}
}


/**
 * Function to get the next player to go
 * @return {int} The id of the next player to go
 */
GameState.prototype.getNextPlayer = function()
{
	return this.current_player;
}

/**
 * Function to set the gamestate to be ready to start running
 * Sets the id of the current player and makes sure the 
 * game over flag is false
 */
GameState.prototype.startRunning = function()
{
	this.current_player = this.x_ids[0];
	this.is_game_over = false;
}



/**
 * Function to get the list of active player ids
 * @return {int_list} The list of player ids that are
 * being used by the game
 */
GameState.prototype.getPlayerIds = function()
{
	return this.player_ids;
}

/**
 * Function to add a new player to the game state. 
 * Checks if it is Mr X or Detective and puts it in
 * the correct place
 * @method GameState#addPlayer
 * @param {Player} player a vliad player object
 */
GameState.prototype.addPlayer = function(player)
{
	this.players.push(player);
	this.player_history[player.id] = player;
	if(player.type=="X")
	{
		this.x_ids.push(player.id);
	}
	else
	{
		this.d_ids.push(player.id);
	}

	this.player_ids.push(player.id);
}

/**
 * Function to set the graph variable. 
 * @param {Graph} graph A valid, initailised graph object
 */
GameState.prototype.setGraph = function(graph)
{
	this.graph = graph;
}



/**
 * Function to get the winning player
 * @return {int} The winning player
 */
GameState.prototype.getWinningPlayer = function()
{
	return this.winning_player;
}






// function to get the number of players
GameState.prototype.getNumberOfPlayers = function()
{
	return this.players.length;
}


GameState.prototype.printPlayers = function()
{
	for(var i = 0; i < this.players.length; i++)
	{
		console.log(this.players[i]);
	}
}



// get a player by an id
GameState.prototype.getPlayer = function(id)
{
	for(var i = 0; i < this.players.length; i++)
	{
		if(id == this.players[i].id)
		{
			return this.players[i];
		}
	}
	return null;
}


GameState.prototype.playerExists = function(id)
{
	for(var i = 0; i < this.player_ids.length; i++)
	{
		if(id == this.player_ids[i]) return true;
	}
	return false;
}

// check if a location is occupied
GameState.prototype.isLocationOccupied = function(loc)
{
	for(var i = 0; i < this.d_ids.length; i++)
	{
		var did = this.d_ids[i];
		if(this.getPlayer(did).location_id == loc) return true;
	}
	return false;
}

GameState.prototype.getPlayers = function()
{
	return this.players;
}


//function that will reomve a player from the game
GameState.prototype.removePlayer = function(player)
{
	console.log("[State]: Removing player " + player.id);
	var id = player.id;
	
	// remove the ids from the array
	var remove_index = 0;
	for(var i = 0; i < this.player_ids.length; i++)
	{
		if(this.player_ids[i] == id) remove_index = i;
	}
	this.player_ids.splice(remove_index,1);

	// remove from detective array
	if(!this.isMrX())
	{
		for(var i = 0; i < this.d_ids.length; i++)
		{
			if(this.d_ids[i] == id) remove_index = i;
		}
		this.d_ids.splice(remove_index,1);
	}

	// remove the player from the players array
	for(var i = 0; i < this.players.length; i++)
	{
		if(id == this.players[i].id) remove_index = i;
	}	
	//this.players.splice(remove_index,1);
}

// function to check if a player is able to move
GameState.prototype.isPlayerUnableToMove = function(player)
{
	var moves = this.getPossibleMoves(player.location_id);
	for(var i = 0; i < moves.length; i++)
	{
		var move = moves[i];
		//console.log(move);
		if(player.getTicketNumber(move.type) > 0 && 
				!this.isLocationOccupied(move.id))
		{
			return false;
		}
	}
	return true;
}

// function to check if a given move is possible
GameState.prototype.moveIsPossible = function(player, target, ticket)
{
	// check the player has enough tickets
	if(player.getTicketNumber(ticket) <= 0)
	{
		console.log("[state]: Not Enough Tickets");
		return false;
	}

	// check connection is valid
	var moves = this.getPossibleMoves(player.location_id);
	var locationsConnected = false;
	for(var i = 0; i < moves.length; i++)
	{
		if(target == moves[i].id && (ticket == moves[i].type || ticket == "SecretMove"))
		{
			locationsConnected = true;
			break;
		}		
	}
	if(!locationsConnected)
	{
		console.log("[state]: Locations are not connected");
		return false;
	}

	// check if the location is occupied
	if(this.isLocationOccupied(target))
	{
		console.log("[state]: Location is occupied");
		return false;
	}

	return true;
}


GameState.prototype.getMrX = function()
{
	var x_id = this.x_ids[0];
	return this.getPlayer(x_id);
}

// function to check if mr x is at a location
GameState.prototype.isMrXAtLocation = function(loc)
{
	if(this.getMrX().id == loc) return true;
	return false;
}

// function to update the tickets
GameState.prototype.updateTickets = function(player, ticket)
{
	player.useTicket(ticket);
	var mr_x = this.getPlayer(this.x_ids[0]);
	mr_x.addTicket(ticket);
}

// function that checks if a player has gotten stuck
GameState.prototype.isPlayerOutOfGame = function(player)
{
	// mr x isnt out of the game
	if(player.type == "X") return false;


	var moves = this.getPossibleMoves(player.location_id);
	for(var i = 0; i < moves.length; i++)
	{
		if(player.getTicketNumber(moves[i].type) > 0) return false;
	}

	return true;
}


// get the list of possible moves from a location
GameState.prototype.getPossibleMoves = function(location_id)
{
	var edges = this.graph.getNodeEdges(location_id);	
	var moves = [];
	for(var i = 0; i < edges.length; i++)
	{
		var e = edges[i];
		var move = {};
		move.type = edges[i].type;
		move.id = location_id == e.id1 ? e.id2 : e.id1;
		moves.push(move);
	}

	return moves;
}


// -----------------------------------------------------------------------------
GameState.prototype.nextTurn = function()
{
	// move on the turn
	var current_index = 0;
	for(var i = 0; i < this.players.length; i++)
	{
		//console.log(this.players[i].id);
		if(this.current_player == this.players[i].id)
		{
			current_index = i;
			break;
		}
	}


	// check wrap around
	var next_index = current_index+1;
	//while(!this.players[this.player_ids[next_index]].is_active)
	//{
	//	next_index++;
	//}


	if(next_index >= this.player_ids.length) next_index = 0;

	this.current_player = this.player_ids[next_index];
	//console.log("[state]: Next Player: " + this.current_player + " " + next_index);
}


GameState.prototype.isMrX = function(id)
{
	if(id == this.getMrX().id) return true;
	return false;
}


GameState.prototype.doMove = function(id, target, ticket)
{
	// get the current player
	var player = this.getPlayer(id);

	// check for enough tickets
	if(this.isPlayerOutOfGame(player))
	{
		this.nextTurn();
		this.removePlayer(player);
		return false;
	}

	if(this.isPlayerUnableToMove(player))
	{
		this.nextTurn();
		return false;
	}


	if(!this.moveIsPossible(player,target,ticket))
	{
		return false;
	}

	player.moveTo(target, ticket);
	player.useTicket(ticket);
	if(ticket != "SecretMove")
	{
		this.getMrX().addTicket(ticket);
	}

	if(this.using_double_move)
	{
		this.double_move_turns++;
		if(this.double_move_turns == 2)
		{
			this.using_double_move = false;
			this.nextTurn();
		}
		return true;

	}

	this.nextTurn();
	return true;
}


GameState.prototype.evaluateGameOver = function()
{
	// is mr x found
	var xloc = this.getMrX().location_id;
	for(var i = 0; i < this.d_ids.length; i++)
	{
		var did = this.d_ids[i];
		if(this.getPlayer(did).location_id == xloc)
		{
			console.log("[state]: Mr X Has Been caught at location " + xloc);
			this.winning_player = did;
			this.is_game_over = true;
			return;
		}
	}

	
	if(this.d_ids.length == 0)
	{
		console.log("[state]: No More Detectives In the Game. Game Over!");
		this.winning_player = this.x_ids[0];
		this.is_game_over = true;
		return;
	}

	if(this.getMrX().move_list.length == MR_X_MAX_TURNS)
	{
		console.log("[state]: Detectives are out of turns. Game Over");
		this.winning_player = this.x_ids[0];
		this.is_game_over = true;
		return;
	}
}

module.exports = GameState;



