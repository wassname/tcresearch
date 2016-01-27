/**
 * Network graph using d3
 * @author wassname
 * @licence MIT
 * Ref: http://bl.ocks.org/mbostock/950642
 */

var svg, force;


/** Converts graph of aspects to network for d3.Force network visualisation **/
function graph2network(graph, paths) {
    // uses globals: translate
    var nodes = [];
    var links = [];
    var keys = Object.keys(graph);
    var entry = "";
    var exit = "";
    var trail_wear = {};

    /** get unique key for a link from a to b **/
    function link_key(a, b) {
        var source = Math.min(a, b);
        var target = Math.max(a, b);
        return source + '-' + target;

    }

    // now if paths is supplied lets visualize them
    if (paths) {
        // fix first and last
        entry = paths[0][0];
        exit = paths[0][paths[0].length - 1];

        // summarise how worn each link is
        paths.forEach(function (path) {
            for (var i = 0; i < path.length - 1; i++) {
                // we don't want to deal with back and forth, so we will
                // set lower number as the source
                var key = link_key(keys.indexOf(path[i]), keys.indexOf((path[i + 1])));

                // add strength proportional to how short path is
                if (!trail_wear[key]) trail_wear[key] = 1;
                trail_wear[key] += 3 / path.length;
            }
        });
    }


    for (var node in graph) {
        if (graph.hasOwnProperty(node)) {

            // is this an entry or exit node?
            var node_type=0;
            if (node==entry) node_type=1;
            if (node==exit) node_type=2;

            nodes.push({
                name: node,
                img: 'aspects/color/' + translate[node] + '.png',
                alias: translate[node],
                node_type: node_type,
                // fixed: node_type>0
            });


            graph[node].forEach(function (link) {

                // how worn is this link in the path?
                var key = link_key(keys.indexOf(node), keys.indexOf(link));
                var strength = trail_wear[key] || 1;

                links.push({
                    source: keys.indexOf(node),
                    target: keys.indexOf(link),
                    strength: strength
                });
            });
        }
    }



    return {
        nodes: nodes,
        links: links
    };
}



var width = parseInt($('#graph-container').attr('width')) || 800,
    height = parseInt($('#graph-container').attr('height')) || 400,
    icon_size = 32,
    link_strength= 0.4;


/** update the graph to be 2/3 of the window height **/
function updateWindow(){
    var e = document.documentElement;
    var g = document.getElementsByTagName('body')[0];
    width = window.innerWidth*0.95 || e.clientWidth*0.95 || g.clientWidth*0.95;
    height = window.innerHeight/3*2|| e.clientHeight/3*2|| g.clientHeight/3*2;

    $('#graph-container').attr("width", width).attr("height", height);
    if (svg) svg.attr("width", width).attr("height", height);
    if (force){force.start();}
}
window.onresize = updateWindow;
updateWindow();

// converts graph to node and links
// https://github.com/mbostock/d3/wiki/Force-Layout
function network_graph(graph, paths) {

    var json = graph2network(graph, paths);

    $('#graph-container svg').remove();

    svg = d3.select($('#graph-container')[0]).append("svg")
        .attr("width", width)
        .attr("height", height);

    force = d3.layout.force()
        .linkStrength(function (l, i) {
            return (l.strength || 1 * link_strength);
        })
        .friction(0.1)
        .linkDistance(150)
        .charge(-1100)
        .gravity(-0.1)
        .theta(0.08)
        .alpha(0.1) // simulation temp
        .size([width, height]);

    /**
     * Gives the coordinates of the border for keeping the nodes inside a frame
     * http://bl.ocks.org/mbostock/1129492
     */
    function nodeTransform(d) {
        d.x =  Math.max(icon_size, Math.min(width - (icon_size/2 || 16), d.x));
        d.y =  Math.max(icon_size, Math.min(height - (icon_size/2 || 16), d.y));
        return "translate(" + d.x + "," + d.y + ")";
       }

    /** set fixed position **/
    function dragstart(d) {
        d3.select(this).classed("fixed", d.fixed = true);
    }
    /** unfix position **/
    function dblclick(d) {
        d3.select(this).classed("fixed", d.fixed = false);
    }

    // sticky force http://bl.ocks.org/mbostock/3750558
    var drag = force.drag()
        .on("dragstart", dragstart);

    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    var link = svg.selectAll(".link")
        .data(json.links)
        .enter().append("line")
        .attr("class", "link")
        .attr("style", function (d) {
            // set color and weight based on strength of link
            var style='';
            if (d.strength>1){
                var weight = (0.2+(d.strength-1)/3);
                style+='stroke-width: ' + (d.strength || 1)+';stroke: rgba(255,50,50,'+weight+');';
            }
            return style;
        });


    var node = svg.selectAll(".node")
        .data(json.nodes)
        .enter().append("g")
        .attr("class", "node")
        .on("dblclick", dblclick)
        .call(force.drag);

    // set start and exist nodes in fixed positions
    force.nodes().forEach(function(d, i) {
        if (d.node_type===1){
            d.fixed=true;
            d.px=width*0.1;
            d.py=height*0.1;
        } else if (d.node_type===2){
            d.fixed=true;
            d.px=width*0.9;
            d.py=height*0.9;
        }
    });

    node.append("svg:image")
        .attr("xlink:href", function (d) {
            return d.img;
        })
        .attr('x',-icon_size/2)
        .attr('y',-icon_size/2)
        .attr("width", function(d){
            if (d.node_type==0) return icon_size;
            return icon_size*1.5;
        })
        .attr("height", function(d){
            if (d.node_type==0) return icon_size;
            return icon_size*1.5;
        })
        .append("svg:title")
        .text(function(d){return d.alias;});

    node.append("text")
        .attr("dx", icon_size/2)
        .attr("dy", ".35em")
        .text(function (d) {
            return d.name;
        });

    force.on("tick", function () {
        link.attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });

        // node.attr("transform", function (d) {
        //     return "translate(" + d.x + "," + d.y + ")";
        // });
        node.attr("transform", nodeTransform);
    });
    return force;
}
