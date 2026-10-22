import assert from 'node:assert/strict';
import test from 'node:test';
import {assertContractAllowsRepurchase,REPURCHASE_UNAVAILABLE_CODE,REPURCHASE_UNAVAILABLE_MESSAGE} from '../lib/contract-repurchase-restrictions.js';

test('670105650 is excluded from repurchase with the customer wording',()=>{
  for(const contract of ['670105650',' 670 105650 ']) {
    assert.throws(()=>assertContractAllowsRepurchase(contract),error=>
      error.status===403 && error.code===REPURCHASE_UNAVAILABLE_CODE
      && error.message==='Diese Küche ist nicht für einen digitalen Nachkauf vorgesehen. Bitte kontaktieren Sie Ihren Vermieter über die alternativen Nachkaufmöglichkeiten.');
  }
  assert.equal(REPURCHASE_UNAVAILABLE_MESSAGE,'Diese Küche ist nicht für einen digitalen Nachkauf vorgesehen. Bitte kontaktieren Sie Ihren Vermieter über die alternativen Nachkaufmöglichkeiten.');
});
test('other contracts, including test contracts, are unaffected',()=>{
  for(const contract of ['670105651','670105793','111105650','222105650','6701056500','']) {
    assert.doesNotThrow(()=>assertContractAllowsRepurchase(contract));
  }
});
