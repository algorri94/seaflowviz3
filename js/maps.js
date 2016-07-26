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
    var bounds = data;
    self.trackData = [
        //Cruise 1
        {cruise_id:1, lat:bounds.getSouth()+1, lon:bounds.getWest()+1, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+1.1, lon:bounds.getWest()+1.1, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+1.2, lon:bounds.getWest()+1.1, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+1.3, lon:bounds.getWest()+1.2, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+1.4, lon:bounds.getWest()+1.2, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+1.8, lon:bounds.getWest()+1.6, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+2.2, lon:bounds.getWest()+1.6, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+2.6, lon:bounds.getWest()+2, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+3, lon:bounds.getWest()+2, epoch_ms:1405958511000},
        {cruise_id:1, lat:bounds.getSouth()+3.4, lon:bounds.getWest()+2.4, epoch_ms: 1406044911000},
        //Cruise 2
        {cruise_id:2, lat:bounds.getSouth()+5.1, lon:bounds.getEast()-4, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+5.2, lon:bounds.getEast()-4.5, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+5.3, lon:bounds.getEast()-4.5, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+5.4, lon:bounds.getEast()-5, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+5.8, lon:bounds.getEast()-6, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+6.2, lon:bounds.getEast()-6.5, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+6.6, lon:bounds.getEast()-7, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+7, lon:bounds.getEast()-7, epoch_ms:1405958511000},
        {cruise_id:2, lat:bounds.getSouth()+7.4, lon:bounds.getEast()-7.4, epoch_ms: 1406044911000}];
    self.update();
    //alert("North:"+bounds.getNorth()+", East:"+bounds.getEast()+", South:"+bounds.getSouth()+", West:"+bounds.getWest());
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
      var arrow = new L.polyline([latestLatLng, calculatePointAtRotation(latestLatLng, self.recPath.rotation)], {
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
        trackLines.bindPopup("Cruise #"+cruise_md.cruise_id+": "+iso(cruise_md.first).slice(0, 10)+" - "+iso(cruise_md.last).slice(0, 10));
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
  var distance = 2;
  var rad = toRadians(degree+180);
  return L.latLng(origLoc.lat+distance*Math.sin(rad), origLoc.lng-distance*Math.cos(rad));
}

function toRadians (angle) {
  return angle * (Math.PI / 180);
}

function parseTrackData(data){
  var cruises = [];
  data.forEach(function(point){
    if(cruises[point.cruise_id]){
      cruises[point.cruise_id].push(point);
    } else {
      cruises[point.cruise_id] = [];
    }
  });
  return formatCruisesTracks(cleanArray(cruises));
}

function formatCruisesTracks(data){
  var output = [];
  for(var i = 0; i<data.length; i++){
    var cruise = data[i];
    var dates = getFirstAndLastDate(cruise);
    var id = cruise[0].cruise_id
    var cruise_data = {cruise_id:id, first:dates[0], last:dates[1]};
    if(output[i]==null || output[id]==undefined){
      output[i] = [];
    }
    output[i].push(cruise_data);
    cruise.forEach(function(point){
        output[i].push({lat:point.lat, lng:point.lon});
    });
  }
  return output;
}

function getFirstAndLastDate(cruise){
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
}

function cleanArray(array){
  var output = [];
  for(var i = 0; i<array.length; i++){
    if(array[i]){
      output.push(array[i]);
    }
  }
  return output;
}