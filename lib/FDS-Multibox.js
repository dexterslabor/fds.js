// Copyright 2019 The FairDataSociety Authors
// This file is part of the FairDataSociety library.
//
// The FairDataSociety library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The FairDataSociety library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the FairDataSociety library. If not, see <http://www.gnu.org/licenses/>.

// mailbox smart contracts

let Web3 = require('web3');
let namehash = require('eth-ens-namehash');
let Swarm = require('./FDS-Swarm.js');

let MultiboxContract = require('./contracts/Multibox.js');
let KeyValueTreeContract = require('./contracts/KeyValueTree.js');

class Multibox {

    constructor(account, config) {
      this.account = account;
      this.con = null;
      this.roots = null;

      this.Store = new Swarm(config, account);
    }

    async at(address){
      this.mb = new MultiboxContract(this.account, address);
      this.roots = await this.mb.getRoots();
      this.kvt = this.roots.map(roots => new KeyValueTreeContract(this.account, this.roots[0]));
      return this;
    }

    async deploy(){
      this.mb = await new MultiboxContract(this.account);
      this.roots = await this.mb.getRoots();
      this.kvt = new KeyValueTreeContract(this.account, this.roots[0]);
      return this;
    }
 
    // note - would be good to check these in reverse to avoid unneccesary calls
    async get(path, key, value){
      let nodeId = await this.Store.getSwarmDigest(path);
      return this.kvt.getKeyValue(nodeId, key);
    }

    async set(path, key, value){
      let nodeId = await this.Store.getSwarmDigest(path);
      return this.kvt.setKeyValue(nodeId, key, value);
    }

    async createPath(path, value, kvti = 0){
      let parentNodeId;
      let splitPath = path.split('/').slice(1);

      if(splitPath[0] === 'root'){
        //do nothing
        parentNodeId = await this.kvt.getRootId();
      }else
      if(splitPath[0] === 'shared'){
        parentNodeId = await this.kvt.getSharedId();
      }else{
        throw new Error('path must begin /shared or /root');
      }

      for (var i = 0; i < splitPath.length - 1; i++) {
        let currentPath = '/'+splitPath.slice(0,i+2).join('/');
        let newNodeId = await this.Store.getSwarmDigest(currentPath);
        let addChildNode = await this.kvt.addChildNode(parentNodeId, newNodeId);
        parentNodeId = newNodeId
      }

      return true;
    }

    async retrieveValues(nodeId){
      let keyValues = {};
      let keyValuesRaw = await this.kvt.getKeyValues(nodeId);
      for (var i = 0; i < keyValuesRaw['keys'].length; i++) {
        keyValues[keyValuesRaw['keys'][i]] = keyValuesRaw['values'][i];
      }      
      return keyValues;
    }

    async retrieveTree(nodeId, values = false){
      let children = await this.kvt.getChildren(nodeId);
      if(children.length === 0 && values === false){
        return {
          id: nodeId,
          parentId: false
        };
      }else
      if(children.length === 0 && values === true){
        return {
          id: nodeId,
          parentId: false,
          values: await this.retrieveValues(nodeId)
        };
      }else{
        return {
          id: nodeId,
          parentId: false,
          values: await this.retrieveValues(nodeId),
          children: await this.retrievesDescendants(nodeId, values)
        };
      }

        // let output = [{
        //   id: nodeId,
        //   parentId: false,
        //   values: children
        // }];
        // for (var i = 0; i < children.length; i++) {
        //   let descendants = await this.retrieveTree(children[i], values);
        //   if(descendants.length > 0){
        //     output.push({
        //       id: children[i],
        //       parentId: nodeId,
        //       children: descendants
        //     });
        //   }else{
        //     if(values === true){
        //       output.push({
        //         id: children[i],
        //         parentId: nodeId,
        //         values: await this.retrieveValues(children[i])
        //       });
        //     }else{
        //       output.push({
        //         id: children[i],
        //         parentId: nodeId
        //       });
        //     }   
        //   }
        // }
        // return output;
      // }
    }

    async retrievesDescendants(nodeId, values = false){
      let children = await this.kvt.getChildren(nodeId);
      let output = []
      for (var i = 0; i < children.length; i++) {
        let descendants = await this.retrievesDescendants(children[i], values);
        if(descendants.length > 0){
          output.push({
            id: children[i],
            parentId: nodeId,
            children: descendants
          });
        }else{
          let keyValues = {};
          if(values === true){
            keyValues = await this.retrieveValues(children[i]);
          }
          output.push({
            id: children[i],
            parentId: nodeId,
            values: keyValues
          });
        }
      }
      return output;
    }

    // retrieves tree structure only of path eg. /shared/mail
    async retrievePathNodes(path){
      let nodeId = await this.Store.getSwarmDigest(path);
      return await this.retrieveTree(nodeId);
    } 


    // retrieves tree structure and keyvalues of path eg. /shared/mail
    async retrievePathValues(path){
      let nodeId = await this.Store.getSwarmDigest(path);
      return await this.retrieveTree(nodeId, true);
    }        

}

module.exports = Multibox;