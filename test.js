var port = 8124;
var debug = true;

var net = require('net');
var fs  = require('fs');
var server = net.createServer(connect);
var ClientHandler = require('./client_handler.js');

// read the input file
fs.readFile(process.argv[2], 'utf8', function(err, data) {
	console.log(data);
});



var expected_client_ids = [1,3,5,4];
var num_detectives      = 10;
var mr_x_client_id      = 5;
var client_handler = new ClientHandler(expected_client_ids, num_detectives);
client_handler.on('all_added', allAdded);

server.listen(port);




// -----------------------------------------------------------------------------
// function that is called when a client tries to connect
function connect(client)
{
	// check if we are accepting new clients
	if(client_handler.allClientsAdded())
	{
		client.end("Sorry, no more clients to add\n");
		return;
	}


	client.setEncoding('utf8');
	client.write("Hello Client\n");
	client.on('data', recieve);
	client.on('end', function() {
		console.log('Bye');
	});
	function recieve(text) { parseInput(client, text) }

}







// -----------------------------------------------------------------------------
// Function to parse the incoming data
function parseInput(client, text)
{
	console.log('[Recieved]: ' + text);
	var parts = text.split(',');
	if(parts[0] == 'join')
	{
		var expected = client_handler.expectsClient(parts[1]);
		if(!expected)
		{
			client.end('You Aren\'t expected client ' + parts[1] + ', go away')
		}
		else
		{
			client_handler.addClient(client, parts[1]);
		}
	}		
}


// -----------------------------------------------------------------------------
function allAdded()
{
	client_handler.writeToClients("Ok guys, lets play!\n");	
	client_handler.writeToClient(5, "Hello Client Five");
}

