var sql = require("sqlite3");
var fs = require('fs');
var path = require('path');
var db = new sql.Database("test.db");

var image_filename       = process.argv[2];
var graph_filename       = process.argv[3];
var pos_filename         = process.argv[4];
var name                 = "standard_game";
if(process.argv[5]) name = process.argv[5];



// read the files in and add them to the database
var graph_path = path.join(__dirname, graph_filename);
var image_path = path.join(__dirname, image_filename);
var pos_path = path.join(__dirname, pos_filename);

console.log("[Message]: Reading Graph File");
var graph_data = fs.readFileSync(graph_path, 'utf8');
console.log("[Message]: Reading Positions File");
var pos_data   = fs.readFileSync(pos_path, 'utf8');
console.log("[Message]: Reading Image File");
var image_data = fs.readFileSync(image_path);

db.serialize(add_to_db);


// put the into the data base
function add_to_db()
{
	db.run("INSERT INTO files VALUES (?,?,?,?,?)", [null, name, graph_data, pos_data, image_data], 
		function(err, data) {
			if(err) throw err;
			console.log("[Message]: Data added Properly!");
	});

}











