const axios = require('axios')

scrape("0");

  function scrape(nextId){
    axios.get('http://www.pathofexile.com/api/public-stash-tabs?id='+nextId)
    .then(function (response) {
      for (var i = 0; i < response.data.stashes.length; i++) {
          const stash = response.data.stashes[i];
          for (var y = 0; y < stash.items.length; y++) {
              const item = stash.items[y];
              if(item.frameType == 5){
                  if(item.note !== undefined){
                    console.log(item.league + " " + item.typeLine + " "+ item.stackSize +" "+ item.note + " " + item.id)
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