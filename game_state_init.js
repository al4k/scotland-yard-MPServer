"use strict";
// ---------------------------------------------------------------------------------
// game_state_init.js
//
// Set of functions that load up the state of the game as empty
// ---------------------------------------------------------------------------------
var path = require('path');
var Graph = require('./graph');
var Player = require('./player');

var RESOURCES_FOLDER = "resources";
var GRAPH_FILENAME   = path.join(RESOURCES_FOLDER, "graph.txt");
var DETECTIVE_TICKETS = {'Taxi': 11, 'Bus':8, 'Underground':4, 'DoubleMove': 0, 'SecretMove': 0};
var MRX_TICKETS = {'Taxi': 0, 'Bus': 0, 'Underground': 0, 'DoubleMove': 2, 'SecretMove': 5};
var AVAILABLE_TICKETS =  {'Taxi': 57, 'Bus': 45, 'Underground': 23, 'DoubleMove': 2, 'SecretMove': 5};

var DETECTIVE_STARTS = [13,123,138,141,155,174,29,26,34,50,53,91,94,103,112,117];
var MRX_STARTS = [35,45,51,71,78,104,106,132,127,146,166,170,172];

//var DETECTIVE_STARTS = [13, 123, 138, 141,155];
//var MRX_STARTS = [35];


// function that builds a set of player objects first by entring them 
//  into the database to get their ids and then creating objects
function createPlayers(num_detectives, session_id, call)
{

	console.log("[Message]: Creating Players");

	var used_starting_locations = [];
	var used_tickets = {};
	used_tickets['Taxi'] = AVAILABLE_TICKETS['Taxi'];
	used_tickets['Bus'] = AVAILABLE_TICKETS['Bus'];
	used_tickets['Underground'] = AVAILABLE_TICKETS['Underground'];
	used_tickets['DoubleMove'] = AVAILABLE_TICKETS['DoubleMove'];
	used_tickets['SecretMove'] = AVAILABLE_TICKETS['SecretMove'];

	var players = [num_detectives+1];


	// main loop for generating detectives
	for(var i = 0; i < num_detectives; i++)
	{
		var loc = get_start_location(DETECTIVE_STARTS);
		var tickets = {};
		tickets['Taxi'] = DETECTIVE_TICKETS['Taxi'];
		tickets['Bus'] = DETECTIVE_TICKETS['Bus'];
		tickets['Underground'] = DETECTIVE_TICKETS['Underground'];
		tickets['DoubleMove'] = DETECTIVE_TICKETS['DoubleMove'];
		tickets['SecretMove'] = DETECTIVE_TICKETS['SecretMove'];

		// update the used tickets
		used_tickets['Taxi'] -= DETECTIVE_TICKETS['Taxi'];
		used_tickets['Bus'] -= DETECTIVE_TICKETS['Bus'];
		used_tickets['Underground'] -= DETECTIVE_TICKETS['Underground'];
		var type = "D";
		var id = i+1;
		var np = new Player(id, loc, type, tickets);
		players[id] = np;
	}

	finalise();

	// function to finalise the player creation and return
	function finalise()
	{
		// generate mrx and return
		var xtype = "X";

		var xtickets = MRX_TICKETS;
		xtickets['Taxi'] = used_tickets['Taxi'];
		xtickets['Bus'] = used_tickets['Bus'];
		xtickets['Underground'] = used_tickets['Underground'];

		var xloc = get_start_location(MRX_STARTS);
		var id = 0;
		var mx = new Player(id, xloc , xtype, xtickets);
		players[id] = mx;
		console.log("[Message]: Players Created");

		for(var i = 0; i < players.length; i++)
		{
			console.log(players[i].id + " " + players[i].location_id);
		}


		call(null, players);


	}

	

	// ----------------------------------------------------
	// Syncronous helpers
	// ----------------------------------------------------


	// function to get a random start location given a list
	function get_start_location(locations)
	{
		var max = locations.length;
		var good_index = false;
		var index = 0;
		while(!good_index)
		{
			index = Math.floor((Math.random()*max));
			if(!location_in_use(index, locations))
			{
				good_index = true;
			}
		}
		used_starting_locations.push(locations[index]);
		return locations[index];
	}

	// function to check if a start location is already occupied
	function location_in_use(index, locations)
	{
		var good = true;
		for(var i = 0; i < used_starting_locations.length; i++)
		{
			if(locations[index] == used_starting_locations[i])
			{
				return true;
			}
		}
		return false;
	}
	

}

// function that loads the graph as a graph object from the graph.txt file
function buildGraph(data)
{
	console.log("[Message]: Building Graph");
		
	// read the data into a graph object
	var lines = data.split("\n");
	var num_nodes = parseInt(lines[0].split(" ")[0]);
	var num_edges = parseInt(lines[0].split(" ")[1]);

	// read out the nodes
	var nodes = [];
	for(var i = 1; i < num_nodes+1; i++)
	{
		var nodeid = parseInt(lines[i]);
		nodes[i-1] = nodeid;
	}

	//  read out the edges
	var edges= [];
	var ecount = 0;
	for(var i = num_nodes+1; i < num_edges+num_nodes+1; i++)
	{
		var parts = lines[i].split(" ");
		var edge = {}
		edge.id1 = parseInt(parts[0]);
		edge.id2 = parseInt(parts[1]);
		edge.dist = parseFloat(parts[2]);
		edge.type = parts[3];	
		edges[ecount] = edge;
		ecount++;
	}	

	// build the graph object
	var graph = new Graph(num_nodes, num_edges, nodes, edges);

	return graph;
}



// main function for initailising the state of the game
exports.initialiseGame = function(num_detectives, callback)
{
	// variables to hold the data going out
	var output = {};
	output.session_id = 0;
	output.graph = null;
	output.players = [];
	output.session_id = 0;
	output.files_id = 0;

	// load the graph from the db
	var fs = require('fs');
	fs.readFile('resources/graph.txt', 'utf8', function(err, data) {
		if(err) throw err;
		output.graph = buildGraph(data);

		createPlayers(num_detectives,
			0, function(err, data) {
			if(err) throw err;
			output.players = data;
			callback(err, output);
		});
	});
}




// function to get the whole game state for it to be streamed over the network
exports.getWholeGameState = function(session_id, game_state, callback)
{
	var output = "";

	output += "session_id:0\n";
	output += "session_name: online_game\n";
	output += "files_id:1\n";
	var players_in = game_state.getPlayers();
	var players = {};
	var player_ids = [];

	for(var i = 0; i < players_in.length; i++)
	{
		player_ids.push(players_in[i].id);
		players[players_in[i].id] = players_in[i];
	}

	// sort the players
	player_ids = player_ids.sort();
	

	getPlayerInfo();

	function getPlayerInfo()
	{
		var num_players = player_ids.length;
		for(var i = 0; i < num_players; i++)
		{
			var player = players[player_ids[i]];
			var info  = "";
			info += "player:";
			info += player.id + ",";
			info += player.type + ",";
			info += player.location_id + ",";
			info += player.tickets['Taxi'] + ",";
			info += player.tickets['Bus'] + ",";
			info += player.tickets['Underground'] + ",";
			info += player.tickets['DoubleMove'] + ",";
			info += player.tickets['SecretMove'] + "\n";


			output += info;

			
		}


		var moves = game_state.getMoves();

		for(var j = 0; j < moves.length; j++)
		{
			var info = "move:";
			info += moves[j].id + ",";
			info += moves[j].previous + ",";
			info += moves[j].target + ",";
			info += moves[j].ticket + "\n";


			/*
			var found = false;
			for(var i = 0; i < player_ids.length; i++)
			{
				if(player_ids[i] == moves[j].id)
					found = true;
			}
			if(found == true)
			{
			}
			*/

			output += info;
		}



		callback(output);
	}


	function processPlayerInfo(data)
	{
		for(var i = 0; i < data.length; i++)
		{
			var row = data[i];
			var info  = "";
			info += "player:";
			for(var prop in row)
			{
				info += "," + row[prop];
			}
			info = info.replace(":,",":");
			info += "\n";	
			output += info;		
		}
	}




	function getMoves(player_ids)
	{
		var num_players = player_ids.length;
		var player_moves_extracted = 0;
		for(var i = 0; i < player_ids.length; i++)
		{
			var moves_info = [];
			db_access.getMoves(player_ids[i], function(err,data) {
				if(err) throw err;

				var info = processMoveInfo(data);

				moves_info.push(info);
				player_moves_extracted++;
				if(player_moves_extracted == num_players)
				{
					for(var r in moves_info)
					{
						output += moves_info[r];
					}				
					callback(output);
				}
			});
		}		
	}

	function processMoveInfo(data)
	{
		var info = "";
		for(var i = 0; i < data.length; i++ )
		{
			var row = data[i];
			info += "move:";
			for(var prop in  row)
			{
				info +="," + row[prop];
			}
			info+="\n";
			info = info.replace(":,",":");
		}
		return info;
	}

}
