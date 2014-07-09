function Graph(num_nodes, num_edges, nodes, edges)
{
	// load the graph from the file
	this.nodes = nodes;
	this.edges = edges;
	this.node_num = num_nodes;
	this.edge_num = num_edges;
}

// function to return the set of edges of a node
Graph.prototype.getNodeEdges = function(node_id)
{
	var output = [];

	for(var i = 0; i < this.edge_num; i++)
	{
		var e = this.edges[i];
		if(e.id1 == node_id || e.id2 == node_id)
		{
			output.push(e);
		}
	}



	return output;
}



module.exports = Graph;
