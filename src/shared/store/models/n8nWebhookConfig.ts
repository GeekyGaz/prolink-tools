import {makeObservable, observable} from 'mobx';
import {serializable} from 'serializr';

export class N8nWebhookConfig {
  @serializable
  @observable
  enabled = false;

  @serializable
  @observable
  url = '';

  constructor() {
    makeObservable(this);
  }
}
