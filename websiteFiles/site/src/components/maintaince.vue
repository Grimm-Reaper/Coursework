<template>
  <v-container>
    <v-card dark>
      <v-card-text>
        To add a currency input the currency's main text name in the first box and then any aliases seperated by commas in the second box
      </v-card-text>
      <v-form>
        <v-text-field
          v-model="name"
          label="currency name"
          required>
        </v-text-field>
        <v-text-field
          v-model="aliases"
          label="currency aliases"
          required>
        </v-text-field>
      </v-form>
      <v-btn
      @click="enter(name,aliases)">
        enter   
      </v-btn>
    </v-card>
  </v-container>
</template>

<script>
  import axios from 'axios'
  export default {

  methods: {
  enter(test,aliases) {
    test=test.replace(/'/g,"''")
    aliases=aliases.replace(/'/g,"''")
    let output= "http://localhost:3000/sql/addcurrency/?"+test.replace(/\ /g,"!")+"$"+aliases.replace(/,\ /g,"%")
    axios.get(output)
  }
  },
  data: () => ({
      name: '',
      aliases:'',
    })
  }
</script>