const axios = require('axios')

scrape("0");

  function scrape(nextId){
      console.log(nextId);
    axios.get('http://www.pathofexile.com/api/public-stash-tabs?id='+nextId)
    .then(function (response) {
      for (var i = 0; i < response.data.stashes.length; i++) {
          const stash = response.data.stashes[i];
          for (var y = 0; y < stash.items.length; y++) {
              if(stash.items[y].frameType == 5){
                  if(stash.items[y].note !== undefined){
                    console.log(JSON.stringify(stash.items[y]))
                  }
              }   
            }
          
        }

        scrape(response.data.next_change_id)
    })
    .catch(function (error) {
      console.log(error)
    });
    
  }