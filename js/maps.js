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
  self.currTemperature = 0;
  self.currSalinity = 0;
  self.pathNames = ["st_neg_temp_neg_sal_rotation",   //0 = Low temperature & low salinity
                    "st_neg_sal_rotation",            //1 = Low salinity
                    "st_pos_temp_neg_sal_rotation",   //2 = High Temperature & low salinity
                    "st_neg_temp_rotation",           //3 = Low temperature
                    "nosteer",                        //4 = No steering
                    "st_rotation",                    //5 = High temperature
                    "st_neg_temp_pos_sal_rotation",   //6 = Low temperature & high salinity
                    "st_sal_rotation",                //7 = High salinity
                    "st_pos_temp_pos_sal_rotation"];  //8 = High temperature & high salinity

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
  //New sfl data recieved, add it to the locations array and update the view
  $(self.events).on("newsfldata", function(event, data) {
    self.addLocs(data.new);
    self.update();
  });
  //New steering temperature parameter recieved, update the current value and update the view
  $(self.events).on("newtemp", function(event, data) {
    self.currTemperature = data;
    self.update();
  });
  //New steering salinity parameter recieved, update the current value and update the view
  $(self.events).on("newsal", function(event, data) {
    self.currSalinity = data;
    self.update();
  });
  //The show tracks button was pressed, get current bounds and send them to the "newbounds" event
  $(self.events).on("show_tracks", function(event, data) {
    var bounds = self.cruiseMap.getBounds();
    $(events).triggerHandler("newbounds", bounds);
  });
  //The show tracks button was pressed when it was already activated, hide the current tracks
  $(self.events).on("hide_tracks", function(event, data) {
    delete self.trackData;
    self.update();
  });
  //New track data recieved, add it to the trackData array and update the view
  $(self.events).on("newtrackdata", function(event, data) {
    self.trackData = data;
    self.update();
  });
  //New steering data recieved, update the recommended path value
  $(self.events).on("newrecpath", function(event, data){
    self.recPath = data;
  });

  //Adds the given LatLong locations to the self.locs array
  self.addLocs = function(newLocs) {
    newLocs.forEach(function(loc) {
      if ($.isNumeric(loc.lat) && $.isNumeric(loc.lon)) {
        loc.latLng = new L.latLng(loc.lat, loc.lon);
        self.locs.push(loc);
      }
    });
  };

  //Updates all the map markers to the current values
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

    if(self.recPath && latestLatLng && self.zoomed){
      var rotation = 0;
      var value = (self.currTemperature + self.currSalinity * 3) + 4;
      if(self.pathNames[value]!=="nosteer"){
        var arrow = new L.polyline([latestLatLng, calculatePointAtRotation(latestLatLng, self.recPath[self.pathNames[value]], self.cruiseMap.getBounds())], {
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
    }

    if(self.trackData){
      console.log(self.trackData);
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

//Adds a copyright signature at the right bottom of the map
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

//Calculates a point at a current degree rotation from the origLoc point. The distance to the point is calculated relative to the screen size
function calculatePointAtRotation(origLoc, degree, bounds){
  var distance = Math.abs(bounds.getNorth()-bounds.getSouth())/10;
  var rad = toRadians(degree+180);
  return L.latLng(origLoc.lat+distance*Math.sin(rad), origLoc.lng-distance*Math.cos(rad));
}

//Transforms degrees to radians
function toRadians (angle) {
  return angle * (Math.PI / 180);
}

function parseTrackData(data){
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
  return formatCruisesTracks(cruises);
}

function formatCruisesTracks(data){
  var output = [];
  console.log(data);
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
  console.log(output);
  return output;
}