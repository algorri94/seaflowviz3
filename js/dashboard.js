// SeaFlow realtime dashboard

function Dashboard(events) {
  var self = this;

  self.refreshTimeMilli = 1 * 5 * 1000; // every 5 seconds
  self.events = events;  // will register jQuery events
  self.pollInterval = null;

  self.data = {
    sfl: [],
    stat: [],
    cstar: []
  };

  // ****************************
  // Register event handlers here
  // ****************************

  // New cruise event
  // Begin data polling
  $(self.events).on("newcruise", function(event, data) {
    self.poll();
  });

  //New bounds event
  //Execute query to get historial track data and throw newtrackdata event with the results
  $(self.events).on("newbounds", function(event, bounds) {
    getTrackData(bounds, function(d){
      console.log(d);
      $(events).triggerHandler("newtrackdata", d);   
    }); 
  });

  // **************************
  // Database polling functions
  // **************************

  // Queries the sfl, the steering and the bacteria data once
  self.pollOnce = function() {
    self.getData({
      cur: self.data.sfl,
      table: "sfl",
      event: "newsfldata",
      recordHandler: sflHandler,
      extra: function(allData, newData) {
        addSpeed(allData);
      }
    });
    queryData("steer",function(d){
      $(events).triggerHandler("newrecpath", d);
    });
    self.getData({
      cur: self.data.stat,
      table: "stat",
      event: "newstatdata",
      recordHandler: statHandler
    });
  };

  // Executes the pollOnce method periodically every 'self.refreshTimeMilli' ms
  self.poll = function() {
    self.pollOnce();  // Get data once
    // Setup to get data at intervals in the future
    self.pollInterval = setInterval(self.pollOnce, self.refreshTimeMilli);
  };


  // options object o:
  //   cur: Array containing current data which will be appended to
  //   table: Name of the type of data to query (sfl or stat)
  //   event: Name of the event to trigger as last step
  //   recordHandler: Function to process one record returned query
  //   extra: Any custom processing one new and accumulated data can be done
  //     in this function. It receives two parameters, allData and newData,
  //     which contain all records and new records processed by recordHandler.
  //     This function will run immediately before the event is triggered.
  self.getData = function(o) {
    if (o.from === undefined && o.cur.length) {
      // Latest epoch timestamp plus 1 ms
      o.from = _.last(_.pluck(o.cur, "date")) + 1;
    }
    getData(o.table, function(jsonp) {
      var data = transformData(jsonp, o.recordHandler);
      o.cur.push.apply(o.cur, data);  // Add new data to cur
      if ($.isFunction(o.extra)) {
        // Run user supplied extra function
        o.extra(o.cur, data);
      }
      if (data.length) {
        console.log("latest=" + new Date(_.last(_.pluck(data, "date"))).toISOString());
        $(self.events).triggerHandler(o.event, { all: o.cur, new: data });
      }
    });
  };
}

// Turn jsonp data into an arrays of JSON objects
// that can be easily fed to visualizations
function transformData(jsonp, recordHandler) {
  var data = [];
  jsonp.forEach(function(d) {
    recordHandler(d, data);
  });
  return data;
}

//Formats the sfl data
function sflHandler(d, data) {
  d.date = d.epoch_ms;
  d.iso8601 = iso(d.epoch_ms);
  if (d.par !== undefined && d.par !== null) {
  d.par = Math.max(d.par, 0);
  }
  data.push(d);
}

//Formats the stat data
function statHandler(d, data) {
  d.date = d.epoch_ms;
  if (popLookup[d.pop]) {  // don't want to include unknown pops
    var curTime = d.date,
        prev = _.last(data);

    if (prev && prev.date === curTime) {
      prev.pops[popLookup[d.pop]] = {
        fsc_small: d.fsc_small,
        abundance: d.abundance
      };
      // Make sure a Prochlorococcus / Synechococcus ratio is present
      if (prev.prosyn === null) {
        if (prev.pops.Prochlorococcus !== undefined &&
            prev.pops.Synechococcus !== undefined &&
            prev.pops.Prochlorococcus.abundance &&
            prev.pops.Synechococcus.abundance) {
          prev.prosyn = prev.pops.Prochlorococcus.abundance / prev.pops.Synechococcus.abundance;
        }
      }
    } else {
      var newData = {
        date: curTime,
        iso8601: iso(curTime),
        prosyn: null,
        pops: {}
      };
      newData.pops[popLookup[d.pop]] = {
        fsc_small: d.fsc_small,
        abundance: d.abundance
      };
      data.push(newData);
    }
  }
}

//Adds the calculated speed to the data
function addSpeed(data) {
  var prev = null;
  data.forEach(function(d) {
    if (prev) {
      if (! d.hasOwnProperty("speed")) {
        d.speed = geo2knots([prev.lon, prev.lat], [d.lon, d.lat],
                            new Date(prev.date), new Date(d.date));
      }
    } else {
      d.speed = null;
    }
    prev = d;
  });
}

// Return the distance between two coordinates in km
// http://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
// by cletus.  Which answer was itself based on
// http://www.movable-type.co.uk/scripts/latlong.html
//
// Args:
//     lonlat1 and lonlat2 are two-item arrays of decimal degree
//     latitude and longitude.
function geo2km(lonlat1, lonlat2) {
  if (! lonlat1 || ! lonlat2) {
    return null;
  }
  if (lonlat1[0] === null || lonlat1[1] === null ||
      lonlat2[0] === null || lonlat2[1] === null) {
    return null;
  }
  var toRad = function(degree) { return degree * (Math.PI / 180); };
  var R = 6371; // km radius of Earth
  var dLat = toRad(lonlat2[1] - lonlat1[1]);
  var dLon = toRad(lonlat2[0] - lonlat1[0]);
  var lat1 = toRad(lonlat1[1]);
  var lat2 = toRad(lonlat2[1]);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c;
  return d;
}

// Return speed in knots traveling between lonlat1 and lonlat2 during time
// interval t1 to t2.
//
// Args:
//     lonlat1 and lonlat2 are two-item arrays of decimal degree
//     latitude and longitude.
//
//     t1 and t2 are Date objects corresponding to coordinates.
function geo2knots(lonlat1, lonlat2, t1, t2) {
  kmPerKnot = 1.852;  // 1 knot = 1.852 km/h
  km = geo2km(lonlat1, lonlat2);
  hours = (t2.getTime() - t1.getTime()) / 1000 / 60 / 60;
  if (km === null) {
    return null;
  }
  return km / hours / kmPerKnot;
}

//Executes the query to get data and executes the callback every 1s with a 5th of the data
function getData(dataType, cb){
  queryData(dataType, function(data){
    var dataItems = Math.round(data.length/5);
    var refreshId = setInterval(function() {
      var output = [];
      if(dataItems>data.length){
        dataItems = data.length;
      }
      cb(data.splice(0, dataItems));
      if (data.length==0) {
        clearInterval(refreshId);
      }
    }, 1000);
  });
  
}

  ////////////////////////////////////////////////////////
 ////////////////////BigDawg Queries/////////////////////
////////////////////////////////////////////////////////

//Queries BigDawg to get the historical track data inside the given bounds and executes the callback with the results
function getTrackData(bounds, cb){
  var url1 = "http://localhost:8080/bigdawg/query";
  var url2 = "http://localhost:8080/bigdawg/jsonquery";
  var query1 = "bdstream(GetTracksInRange, "+bounds.getSouth()+", "+bounds.getNorth()+", "+bounds.getWest()+", "+bounds.getEast()+")";
  var query2 = "bdrel(SELECT s_cruise, s_lat, s_lon, s_epoch_ms FROM psql_sflavg_tbl WHERE s_cruise='SCOPE_1')";
  //Query to S-Store
  /*$.ajax({
    url : url1,
    type : "POST",
    data: query1,
    error : function(xhr, ts, et) {
      console.log("The query "+query+" failed. Error message: " + et);
    },
    success : function(jsonArray) {
      console.log(jsonArray);
      cb($.parseJSON(jsonArray));
    }
  });*/
  //Query to postgres
  $.ajax({
    url : url2,
    type : "POST",
    data: query2,
    error : function(xhr, ts, et) {
      console.log("The query "+query+" failed. Error message: " + et);
    },
    success : function(jsonArray) {
      cb($.parseJSON(jsonArray));
    }
  });
}

//Executes a query on BigDawg which depends on the dataType given and executes the callback with the given results
function queryData(dataType, cb)
{ 
  var query = "";
  if(dataType=="sfl") query = "bdstream(GetSFLData)";
  if(dataType=="stat") query = "bdstream(GetBACData)";
  if(dataType=="steer") query = "bdstream(MultiSteering)";
  var url = "http://localhost:8080/bigdawg/query";
  var data = null;
  $.ajax({
    url : url,
    type : "POST",
    data: query,
    error : function(xhr, ts, et) {
      console.log("The query "+query+" failed. Error message: " + et);
    },
    success : function(jsonArray) {
      cb($.parseJSON(jsonArray));
    }
  });
}