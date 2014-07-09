var sql = require("sqlite3");
var db = new sql.Database("test.db");
db.serialize(create_game_db);


function create_game_db()
{
	table_names = ["session", "player", "move", "files", "state"];
	for(var i = 0; i < table_names.length; i++)
	{
		db.run("DROP TABLE IF EXISTS "+table_names[i]);
	}	
	db.run(create_file_db());	
	db.run(create_session_table_string());
	db.run(create_player_table_string());
	db.run(create_moves_table_string());
	
	db.close();


	function create_file_db()
	{
		output = "CREATE TABLE files (" +
			"files_id INTEGER PRIMARY KEY, " +
			"name TEXT, " +
			"graph TEXT, " +
			"pos TEXT, " +
			"map BLOB )";

		return output;
			
	}


	function create_session_table_string()
	{
		output = "CREATE TABLE session (" +
			"session_id INTEGER PRIMARY KEY," +
			"name TEXT, " +
			"files_id INTEGER, " +
			"FOREIGN KEY(files_id) REFERENCES files(files_id))";
		return output;
	}

	function create_player_table_string()
	{

		output = "CREATE TABLE player (" +
			"player_id INTEGER PRIMARY KEY," +
			"type TEXT," +
			"location INTEGER," +
			"taxi_tickets INTEGER," +
			"bus_tickets INTEGER," +
			"underground_tickets INTEGER," +
			"double_tickets INTEGER," +
			"secret_tickets INTEGER," +
			"session_id INTEGER," +
			"FOREIGN KEY(session_id) REFERENCES session(session_id))";

		return output;
	}

	function create_moves_table_string()
	{
		output = "CREATE TABLE move (" +
			"move_id INTEGER PRIMARY KEY," +
			"start_location INTEGER," +
			"end_location INTEGER," +
			"ticket_type TEXT," +
			"player_id INTEGER," +
			"FOREIGN KEY(player_id) REFERENCES player(player_id))";
		return output;
	}



}

function startup() {
  db.run("create table state (" +
         "player text, place text, tickets int)");
  db.run("insert into state values('1', '42', 7)");
  db.close();
}
