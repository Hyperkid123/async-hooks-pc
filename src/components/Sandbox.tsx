import { ScalprumComponent} from '@scalprum/react-core'
import CounterHook from './CounterHook';
import PassThroughHook from './PassThroughHook';

const Sandbox = () => {
  return (
    <div>
      <h1>Sandbox</h1>
      <div>
        <h2>Title from remote:</h2>
        <ScalprumComponent scope="chrome" module="./Title" />
      </div>
      <CounterHook />
      <PassThroughHook />
    </div>
  )
}

export default Sandbox;
