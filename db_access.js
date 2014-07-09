// db_access.js
// ------------
"use strict";

// Create the connection to the database.
var sql = require("sqlite3");
var db = new sql.Database("test.db");

/**
 * Function that will create a new game session in
 * the session table. 
 * @method addSession
 * @param {String} session_name The name that you want to give to the 
 * new session
 * @param {int} files_id The id of the files that you wish to use for this
 * session. This is a row id from the files table
 * @param {addSessionCallback} callback This is the callback that should be fired when
 * the insert operation has finished
 */
exports.addSession = function(session_name, files_id, callback)
{
	db.run("INSERT INTO session VALUES (?,?, ?)", [null,session_name, files_id], function(err, data) {
		if(err) callback(err);
		callback(null, this.lastID);
	});
}
/**
 * This is the prototype of the callback that must be invoked from the
 * addSession function
 * @callback addSessionCallback
 * @param {Error} err Error object. If there is no error, this should be null
 * @param {int} session_id The id of the session that was added into the database (this is
 * returned after a succesfull INSERT function
 */



/**
 * Function that will add a new player into the player database. This method 
 * should invoke a callback after completion with the created id of the player
 * @method addPlayer
 * @param {int} session_id The id of the session the player is associated with
 * @param {String} player_type The type of the player. Mr X = "X", Detective
 * = "D"
 * @param {int} player_location The location  of the player (node id)
 * @param {tickets} tickets This is the set of tickets that player should have 
 * @param {addPlayerCallback} callback This is the callback that is invoked
 * when the player has been added to the database
 */
exports.addPlayer = function(session_id, player_type, player_location,
	   tickets, callback)
{
	// create the SQL
	db.run("INSERT INTO player VALUES (?,?,?,?,?,?,?,?,?)",
		[null,player_type,player_location,
		tickets['Taxi'], tickets['Bus'], tickets['Underground'],
		tickets['DoubleMove'], tickets['SecretMove'], session_id], function(err, data){
			// if error
			if(err) callback(err);

			// else
			callback(null, this.lastID);
		});	

}
/**
 * This is an object that holds a set of tickets
 * @typedef tickets
 * @type {object} 
 * @property {int} Taxi 
 * @property {int} Bus
 * @property {int} Underground
 * @property {int} DoubleMove
 * @property {int} SecretMove
 */
/**
 * This is the callback that is invoked after a player has been added. 
 * @callback addPlayerCallback
 * @param {Error} err If there is not an error this will be null.
 * @param {int} player_id The id of the player that has just been added into
 * the database
 */


/**
 * This is a function that adds a move into the move table.
 * @param {int} player_id The id of the player moving
 * @param {int} previous_location The location of the player before the move
 * @param {int} target_location The location of where the player needs to move
 * to
 * @param {String} ticket The type of ticket that the player will use
 * @param {addMoveCallback} callback The callback function triggered after the
 * add move function has finished
 */
exports.addMove = function(player_id, previous_location, target_location, ticket, callback)
{
	db.run("INSERT INTO move VALUES (?,?,?,?,?)", 
			[null,previous_location,target_location,ticket,player_id], 
			function(err, data) {
				if(err) return callback(err);
				callback(null);
	});
			

}
/**
 * This is called when the addMove function has finished
 * @callback addMoveCallback
 * @param {Error} err If there was an error it should be held here. Should be
 * null if no error
 */

/**
 * This function is to get a players current location from the database
 * @param {int} player_id The id of the player we are looking up
 * @param {getPlayerLocationCallback} callback Function invoked after query is
 * finished
 */
exports.getPlayerLocation = function(player_id, callback)
{
	db.get("SELECT location FROM player WHERE player_id=?", [player_id], function(err, data){
		if(err) return callback(err);
		var loc = data.location;	
		callback(null,loc);
	});

}
/**
 * Callback function for the getPlayerLocation function
 * @callback getPlayerLocationCallback 
 * @param {Error} err Error Object
 * @param {int} location The players location
 */


/** 
 * Function to set the location of a player
 * @param {int} player_id The player ID
 * @param {int} new_location The location we want to set 
 * @param {setPlayerLocationCallback} callback The function callback
 */
exports.setPlayerLocation = function(player_id, new_location, callback)
{
	db.run("UPDATE player SET location = ? WHERE player_id = ?", [new_location,player_id], function(err, data) {
		if(err) return callback(err);
		callback(null);
	});
}
/**
 * Callback function for the setPlayerLocation function
 * @callback setPlayerLocationCallback
 * @param {Error} err Error object, null if no error
 */



// function to get a variable file from the db
exports.getFile = function(files_id, type, callback)
{
	db.get("SELECT "+type+" FROM files WHERE files_id=?", [files_id], function(err,data) {
		if(err) return callback(err);
		callback(null, data[type]);
	});
}


/**
 * Function to get a session from the session table
 * @param {int} session_id The id of the session we are looking up
 * @param {getSessionCallback} callback The triggered function callback
 */
exports.getSession = function(session_id, callback)
{
	db.get("SELECT * FROM session WHERE session_id=?", [session_id], function(err,data) {
		if(err) return callback(err);
		callback(null, data);
	});	
}
/**
 * Callback triggered by the getSession function.
 * @callback getSessionCallback
 * @param {Error} err Error object
 * @param {db_row} data The extracted row from the database
 */



/**
 * Function to get a plyer from the database
 * @param {int} player_id The id of the player
 * @param {getPlayerCallback} callback The triggered callback of the function
 */
exports.getPlayer = function(player_id, callback)
{
	db.get("SELECT * FROM player WHERE player_id=?",[player_id], function(err, data) {
		if(err) return callback(err);
		callback(null,data);
	});
}
/**
 * Callback for the get player function. It should pass out an error or an
 * object containing the player information
 * @callback getPlayerCallback
 * @param {Error} err An Error object
 * @param {db_row} data The row extracted from the database
 */


/**
 * This is a function that will get all the moves from the moves table
 * corresponding to a certain player
 * @param {int} player_id The id of the player
 * @param {getMovesCallback} callback The callback triggered when this function
 * is complete
 */
exports.getMoves = function(player_id, callback)
{
	db.all("SELECT * FROM move WHERE player_id=?",[player_id], function(err,data) {
		if(err) return callback(err);
		callback(null, data);
	})
}
/**
 * Callback for the get moves function
 * @callback getMovesCallback
 * @param {Error} err The error object
 * @param {db_rows} data The list of rows corresponding to the players moves
 */


/**
 * Function to get all the player ids that are associated with a given session
 * @param {int} session_id The id of the session
 * @param {getPlayerIdsCallback} callback The function that is triggered after
 * the db query
 */
exports.getPlayerIds = function(session_id, callback)
{
	db.all("SELECT player_id FROM player WHERE session_id=?", [session_id], function(err,data) {
		if(err) return callback(err);
		callback(null, data);
	});
}
/**
 * callback function for the getPlayerIds function
 * @callback getPlayerIdsCallback 
 * @param {Error} err The error object
 * @param {db_rows} data The extracted ids in the form of database rows
 */


/*
// function to add a move to the db
exports.add_move = function(player_id, target, ticket, callback)
{
	var previous_location = 0;
	// first we get the current player posistion
	db.get("SELECT location FROM player WHERE player_id=?", [player_id], function(err, data){
		previous_location = data.location;	


		// now we update the player position
		db.run("UPDATE player SET location = ? WHERE player_id = ?", [target,player_id], function(err, data) {
		
			// add the move to the moves table
			db.run("INSERT INTO move VALUES (?,?,?,?,?)", [null,previous_location,target,ticket,player_id], function() {
				callback(null,1);
			})
			
		})
	});		
}
*/




/*

// function that dumps all the information realiting to a session into a string
// to be fed back to the client
exports.dump_session = function(session_id, callback)
{
	var dump = "";


	// get the session info
	db.get("SELECT * FROM session WHERE session_id=?", [session_id], function(err, data) {
		if(err) { callback(err, null); return; }

		dump += "session_id:" + data["session_id"] + "\n";
		dump += "session_name:"+ data["name"] + "\n";
		dump += "files_id:"+ data["files_id"] + "\n";

		get_players();
	});


	// function to get the players from the database 
	function get_players()
	{
		db.all("SELECT * FROM player WHERE session_id=?", [session_id], function(err, data) {
			if(err) { callback(err, null); return; }

			var player_ids = [];
			var nrows = data.length;
			for(var i = 0; i < nrows; i++)
			{
				var row = data[i];
				dump += "player:";
				for(var prop in row)
				{
					if(prop == 'player_id') player_ids.push(row[prop]);
					dump += "," + row[prop];
				}
				dump = dump.replace(":,",":");
				dump += "\n";


						
			}
		get_moves(player_ids, finalise);
		});
	}


	function get_moves(player_ids, call)
	{	
		if(player_ids.length < 1) 
		{
			callback(null,dump);
			return;
		}

		// creeate the statement
		var stmt = "SELECT * FROM move WHERE player_id=?";
		if(player_ids.length > 1)
		{
			for(var i = 1; i < player_ids.length; i++)
			{
				stmt += " OR player_id=?";			
			}
		}
		
		db.all(stmt, player_ids, finalise);
	}


	// finalise the data dump
	function finalise(err, data)
	{
		if(err) { callback(err, null); return; }

		for(var i = 0; i < data.length; i++ )
		{
			var row = data[i];
			dump+= "move:";
			for(var prop in  row)
			{
				dump +="," + row[prop];
			}
			dump+="\n";
			dump = dump.replace(":,",":");
		}
		callback(null, dump);
	}


}

*/


