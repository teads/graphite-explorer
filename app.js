'use strict';

var host = 'graphite';
var proto = 'http';
var findEndpoint = proto + '://' + host + '/metrics/find?query=';
var renderEndpoint = proto + '://' + host + '/render?target=';
var from = 'from=-1hours';

function tree(node, callback) {
  callback(find(node));
}

function find(node) {
  var path = '';
  if (node.id == '#') {
    path = '*';
  } else {
    path = node.id.replace(/^#./, '') + '.*';
  }
  var query = findEndpoint + path;
  var j = $.parseJSON(
    $.ajax({
      url: query,
      async: false
    }).responseText
  );

  return children(node.id, j);
}

function children(parent, data) {
  return data
    .map(function(el) {
      return {
        id: parent + '.' + el.text,
        text: el.text,
        children: el.leaf == 0 ? true : false,
        icon: el.leaf == 0 ? 'jstree-folder' : 'jstree-file',
        data: { leaf: el.leaf }
      };
    })
    .sort(function(a, b) {
      return a.text > b.text;
    });
}

function getData(id) {
  var query = renderEndpoint + id + '&' + from + '&format=json';
  var j = $.parseJSON(
    $.ajax({
      url: query,
      async: false
    }).responseText
  );
  var datapoints = j[0].datapoints;
  return datapoints.map(function(el) {
    return { x: el[1], y: el[0] };
  });
}

var chart;
function draw(id) {
  var canvas = document.getElementById('chart');
  var ctx = canvas.getContext('2d');
  if (chart != null) {
    chart.destroy();
  }
  var data = getData(id);
  var labels = data.map(function(el) {
    return new Date(el.x * 1e3).toISOString().slice(-13, -5) + 'UTC';
  });
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: id,
          data: data,
          borderColor: ['rgba(255,99,132,1)'],
          borderWidth: 1
        }
      ]
    }
  });
}

$(function() {
  $('#jstree').jstree({
    core: {
      data: tree
    }
  });
});

$('#jstree').on('changed.jstree', function(e, data) {
  if (data.node.data.leaf == 1) {
    draw(data.node.id.replace(/^#./, ''));
  }
});
