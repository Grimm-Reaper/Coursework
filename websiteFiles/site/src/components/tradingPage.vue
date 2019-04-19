<template>
  <v-container fluid grid-list-xl>
    <v-layout wrap>
      <v-flex>
        <v-select
          :items="currencies"
          outline
          label="Starting Currency"
          v-model="startCurrency"
          @change="update"
        ></v-select>
      </v-flex>
      <v-flex>
        <v-select
          :items="currencies"
          outline
          label="Target Currency"
          v-model="TargetCurrency"
          @change="update"
       ></v-select>
      </v-flex>
      <v-flex>
      <v-select
          :items="leagues"
          outline
          label="League"
          v-model="leagueSelected"
          @change="update()"
        ></v-select>
      </v-flex>
      <v-flex>
        <v-select
          :items="tradeNumberOptions"
          outline
          label="Max number of trades"
          v-model="maxTrades"
          @change="update()"
        ></v-select>
      </v-flex>

    </v-layout>
    <v-flex>
      <v-card><p>{{text}}</p>
      </v-card>
    </v-flex>
  </v-container>
</template>

<script>
  import axios from 'axios'
  var leagues = []
    axios.get('http://localhost:3000/sql/leagues')
  .then(function (response) {
    for (var i = 0; i < response.data.length; i++)
    {
      leagues.push(JSON.stringify(response.data[i].leagueName).replace(/\"/g,""))
    }
  })
  var currencies = []
    axios.get('http://localhost:3000/sql/currencies')
  .then(function (response) {
    for (var i = 0; i < response.data.length; i++)
    {
      currencies.push(JSON.stringify(response.data[i].currencyTextName).replace(/\"/g,""))
    }
  })
  export default { 
  methods: ()=>({
    update: function ()
    {
    console.log("wait")
    text="text";
    }
  }),
  data: () => ({
      tradeNumberOptions:[1,2,3,4],
      leagues,
      currencies,
      startCurrency:"",
      targetCurrency:"",
      leagueSelected:"",
      maxtrades:"",
      text:"wiugrt",
    }),
  }

</script>
