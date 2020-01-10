import React, { Component } from 'react';
import Video from './components/video'
import './App.css';
import './styles/video.css'
import { BrowserRouter, Route } from 'react-router-dom';
import { goToRoomInput } from './components/goToRoomInput';


class App extends Component {
  render() {
    return (
      <BrowserRouter>
       <React.Fragment>
          <Route path="/" exact component={goToRoomInput}/>
          <Route 
            path="/:roomId"  
            render={(name) => <Video {...name} {...this.props} name=":name"/>}/>
        </React.Fragment>
      </BrowserRouter>
    )
  }
}

export default App;
