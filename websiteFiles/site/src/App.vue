<template>
  <v-app dark>
    <v-toolbar>
      <v-toolbar-title class="headline text-uppercase">
        <span>Path Of Exile Currency Calculator</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn
        flat
        @click="step=1"
      >
        <span class="mr-2">Trading</span>
      </v-btn>
      <v-btn
        flat
        @click="step=2"
      >
        <span class="mr-2">Graphs</span>
      </v-btn>
      <v-btn
        flat
        @click="step=3"
      >
        <span class="mr-2">About</span>
      </v-btn>
      <v-avatar
        color="primary lighten-2"
        class="subheading white--text"
        size="24"
        v-text="step"
        @click="step=4"
      ></v-avatar>
    </v-toolbar>
    <v-window v-model="step">
      <v-window-item :value="1">
        <tradingPage></tradingPage>
      </v-window-item>
    <v-window-item :value="2">
      <graphPage></graphPage>
    </v-window-item>
    <v-window-item :value="3">
      <about></about>
    </v-window-item>
        <v-window-item :value="4">
      <maintaince>
      </maintaince>
    </v-window-item>
    </v-window>
  </v-app>
</template>

<script>
import graphPage from './components/graphPage'
import tradingPage from './components/tradingPage'
import about from './components/About'
import maintaince from './components/maintaince'

export default {
  name: 'App',
  components: {
    graphPage,
    tradingPage,
    about,
    maintaince
  },
  data () {
    return {
      step: 1,
    }
  }
}

</script>
