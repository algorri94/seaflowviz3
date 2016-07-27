// ****************************************************************************
// Maps
// ****************************************************************************
function SeaflowMap(div, events) {
  var self = this;
  self.events = events;
  // Objects with lat, lon, date, and map library specific coordinate object
  self.locs = [];
  self.recPath = null;
  self.cruiseLayer = null;
  self.trackData = null;

  self.cruiseMap = L.map(div,{zoomControl:false}).setView([47, -122], 4);
  L.control.zoom({position:'bottomright'}).addTo(self.cruiseMap);
  L.Icon.Default.imagePath = '/leaflet/images';

  L.tileLayer.provider("Esri.OceanBasemap").addTo(self.cruiseMap);
  //localTileLayer("127.0.0.1:3002").addTo(self.cruiseMap);
  self.zoomed = false;
  self.min = null;
  self.max = null;

  L.control.mousePosition({
    position: "topright",
    separator: "   ",
    lngFormatter: function(lng) { return "Lon: " + lng.toFixed(5); },
    latFormatter: function(lat) { return "Lat: " + lat.toFixed(5); }
  }).addTo(self.cruiseMap);  // add mouse coordinate display

  // Register event handlers here
  $(self.events).on("newsfldata", function(event, data) {
    self.addLocs(data.new);
    self.update();
  });
  $(self.events).on("show_tracks", function(event, data) {
    var bounds = self.cruiseMap.getBounds();
    $(events).triggerHandler("newbounds", bounds);
  });
  $(self.events).on("hide_tracks", function(event, data) {
    delete self.trackData;
    self.update();
  });
  $(self.events).on("newtrackdata", function(event, data) {
    self.trackData = data;
    self.update();
  });
  $(self.events).on("newcruise", function(event, data) {
    self.locs = [];
    self.update();
    self.zoomed = false;
  });
  $(self.events).on("newrecpath", function(event, data){
    self.recPath = data;
    self.update();
  });

  self.addLocs = function(newLocs) {
    newLocs.forEach(function(loc) {
      if ($.isNumeric(loc.lat) && $.isNumeric(loc.lon)) {
        loc.latLng = new L.latLng(loc.lat, loc.lon);
        self.locs.push(loc);
      }
    });
    self.update();
  };

  self.update = function() {
    if (self.locs.length === 0) {
      return;
    }
    var allLatLngs = [];
    var selectedLatLngs = [];
    self.locs.forEach(function(doc) {
      allLatLngs.push(doc.latLng);
      if (self.min === null && self.max === null) {
        // All points selected if no date range has been set
        selectedLatLngs.push(doc.latLng);
      } else if (doc.date >= self.min && doc.date <= self.max) {
        selectedLatLngs.push(doc.latLng);
      }
    });
    var latestLatLng = allLatLngs[allLatLngs.length-1];
    var boatIcon = L.icon({
      iconUrl: 'leaflet/images/boat.png',
      iconSize: [16, 16],
      weight: 5
    });
    var latestCircle = new L.marker(latestLatLng, {icon: boatIcon});
    var selectedCruiseLine = new L.polyline(selectedLatLngs, {
      color: "red",
      weight: 4,
      opacity: 0.5,
      smoothFactor: 1
    });

    var fg = L.featureGroup([selectedCruiseLine, latestCircle]);

    if(self.recPath){
      var arrow = new L.polyline([latestLatLng, calculatePointAtRotation(latestLatLng, self.recPath.st_rotation)], {
        color: "green",
        weight: 4,
        opacity: 1,
        smoothFactor: 1
      });
      var decorator = L.polylineDecorator(arrow, {
          patterns: [
              // define a pattern of 10px-wide dashes, repeated every 20px on the line 
              {offset: '100%', repeat: 0, symbol: new L.Symbol.arrowHead({pixelSize: 5, polygon: false, pathOptions: {
                stroke: true,
                color: "green",
                opacity: 1,
                weight: 4}})}
          ]
      });
      fg.addLayer(arrow);
      fg.addLayer(decorator);
    }

    if(self.trackData){
      var trackData = parseTrackData(self.trackData);
      for(var i = 0; i<trackData.length; i++){
        var cruise_md = trackData[i][0];
        var data = trackData[i].splice(1,trackData[i].length);
        var trackLines = new L.polyline(data, {
          color: "black",
          weight: 4,
          opacity: 0.5,
          smoothFactor: 1
        });
        trackLines.bindPopup("Cruise: "+cruise_md.cruise_id);
        fg.addLayer(trackLines);
      }
    }
    

    if (self.cruiseLayer) {
      self.cruiseMap.removeLayer(self.cruiseLayer);
    }
    self.cruiseMap.addLayer(fg);
    self.cruiseLayer = fg;
    if (! self.zoomed) {
      // Only zoom to fit once
      self.cruiseMap.fitBounds(fg.getBounds());
      self.zoomed = true;
    }
  };
}

function localTileLayer(tileHost) {
  var tileURL = 'http://' + tileHost + '/{z}/{x}/{y}.png';
  var attribution = 'Map data &copy; ';
  attribution += '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ';
  attribution += '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';
  return L.tileLayer(tileURL, {
    attribution: attribution,
    maxZoom: 8
  });
}

function calculatePointAtRotation(origLoc, degree){
  var distance = 0.5;
  var rad = toRadians(degree+180);
  return L.latLng(origLoc.lat+distance*Math.sin(rad), origLoc.lng-distance*Math.cos(rad));
}

function toRadians (angle) {
  return angle * (Math.PI / 180);
}

function parseTrackData(data){
  console.log(JSON.stringify(data));
  console.log('');
  console.log('');
  console.log('');
  var cruises = [];
  var dict = {};
  var i = 0;
  data.forEach(function(point){
    if(dict[point.s_cruise] == null || dict[point.s_cruise] == undefined) {
      dict[point.s_cruise] = i;
      i++;
    }
    if(cruises[dict[point.s_cruise]]){
      cruises[dict[point.s_cruise]].push(point);
    } else {
      cruises[dict[point.s_cruise]] = [];
    }
  });
  //return formatCruisesTracks(cleanArray(cruises));
  return formatCruisesTracks(cruises);
}

function formatCruisesTracks(data){
  var output = [];
  for(var i = 0; i<data.length; i++){
    var cruise = data[i];
    var id = cruise[0].s_cruise;
    var cruise_data = {cruise_id:id};
    if(output[i]==null || output[i]==undefined){
      output[i] = [];
    }
    output[i].push(cruise_data);
    cruise.forEach(function(point){
        output[i].push({lat:point.s_lat, lng:point.s_lon});
    });
  }
  console.log(JSON.stringify(output));
  return output;
}

/*function getFirstAndLastDate(cruise){
  var first = Number.MAX_VALUE;
  var last = 0;
  cruise.forEach(function(point){
    if(point.epoch_ms>last){
      last = point.epoch_ms;
    } else if (point.epoch_ms<first){
      first = point.epoch_ms;
    }
  });
  return [first,last];
}*/

/*function cleanArray(array){
  var output = [];
  for(var i = 0; i<array.length; i++){
    if(array[i]){
      output.push(array[i]);
    }
  }
  return output;
}*/