/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');

module.exports = App.WizardRoute.extend({
  route: '/highAvailability/ResourceManager/enable',

  enter: function (router, transition) {
    var rMHighAvailabilityWizardController = router.get('rMHighAvailabilityWizardController');
    rMHighAvailabilityWizardController.dataLoading().done(function () {
      //Set YARN as current service
      App.router.set('mainServiceItemController.content', App.Service.find().findProperty('serviceName', 'YARN'));
      App.router.get('updateController').set('isWorking', false);
      var popup = App.ModalPopup.show({
        classNames: ['full-width-modal'],
        header: Em.I18n.t('admin.rm_highAvailability.wizard.header'),
        bodyClass: App.RMHighAvailabilityWizardView.extend({
          controller: rMHighAvailabilityWizardController
        }),
        primary: Em.I18n.t('form.cancel'),
        showFooter: false,
        secondary: null,

        onClose: function () {
          var rMHighAvailabilityWizardController = router.get('rMHighAvailabilityWizardController'),
              currStep = rMHighAvailabilityWizardController.get('currentStep'),
              self = this;

          if (parseInt(currStep) === 4) {
            App.showConfirmationPopup(function () {
              router.get('updateController').set('isWorking', true);
              rMHighAvailabilityWizardController.finish();
              App.clusterStatus.setClusterStatus({
                clusterName: App.router.getClusterName(),
                clusterState: 'DEFAULT',
                localdb: App.db.data
              }, {
                alwaysCallback: function () {
                  self.hide();
                  router.transitionTo('main.services.index');
                  location.reload();
                }
              });
            }, Em.I18n.t('admin.rm_highAvailability.closePopup'));
          } else {
            router.get('updateController').set('isWorking', true);
            rMHighAvailabilityWizardController.finish();
            App.clusterStatus.setClusterStatus({
              clusterName: App.router.getClusterName(),
              clusterState: 'DEFAULT',
              localdb: App.db.data
            }, {
              alwaysCallback: function () {
                self.hide();
                router.transitionTo('main.services.index');
                location.reload();
              }
            });
          }
        },
        didInsertElement: function () {
          this.fitHeight();
        }
      });
      rMHighAvailabilityWizardController.set('popup', popup);
      var currentClusterStatus = App.clusterStatus.get('value');
      if (currentClusterStatus) {
        switch (currentClusterStatus.clusterState) {
          case 'RM_HIGH_AVAILABILITY_DEPLOY' :
            rMHighAvailabilityWizardController.setCurrentStep(currentClusterStatus.localdb.RMHighAvailabilityWizard.currentStep);
            break;
          default:
            var currStep = App.router.get('rMHighAvailabilityWizardController.currentStep');
            rMHighAvailabilityWizardController.setCurrentStep(currStep);
            break;
        }
      }
      Em.run.next(function () {
        router.transitionTo('step' + rMHighAvailabilityWizardController.get('currentStep'));
      });
    });
  },

  step1: Em.Route.extend({
    route: '/step1',
    connectOutlets: function (router) {
      var controller = router.get('rMHighAvailabilityWizardController');
      controller.dataLoading().done(function () {
        controller.setCurrentStep('1');
        controller.connectOutlet('rMHighAvailabilityWizardStep1', controller.get('content'));
      })
    },
    unroutePath: function () {
      return false;
    },
    next: function (router) {
      var controller = router.get('rMHighAvailabilityWizardController');
      controller.setDBProperty('rmHosts', undefined);
      controller.clearMasterComponentHosts();
      router.transitionTo('step2');
    }
  }),

  step2: Em.Route.extend({
    route: '/step2',
    connectOutlets: function (router) {
      var controller = router.get('rMHighAvailabilityWizardController');
      controller.dataLoading().done(function () {
        controller.setCurrentStep('2');
        controller.loadAllPriorSteps();
        controller.connectOutlet('rMHighAvailabilityWizardStep2', controller.get('content'));
      })
    },
    unroutePath: function () {
      return false;
    },
    next: function (router) {
      var wizardController = router.get('rMHighAvailabilityWizardController');
      var stepController = router.get('rMHighAvailabilityWizardStep2Controller');
      var currentRM = stepController.get('servicesMasters').filterProperty('component_name', 'RESOURCEMANAGER').findProperty('isInstalled', true);
      var additionalRM = stepController.get('servicesMasters').filterProperty('component_name', 'RESOURCEMANAGER').findProperty('isInstalled', false);
      var rmHost = {
        currentRM: currentRM.get('selectedHost'),
        additionalRM: additionalRM.get('selectedHost')
      };
      wizardController.saveRmHosts(rmHost);
      wizardController.saveMasterComponentHosts(stepController);
      router.transitionTo('step3');
    },
    back: function (router) {
      router.transitionTo('step1');
    }
  }),

  step3: Em.Route.extend({
    route: '/step3',
    connectOutlets: function (router) {
      var controller = router.get('rMHighAvailabilityWizardController');
      controller.dataLoading().done(function () {
        controller.setCurrentStep('3');
        controller.loadAllPriorSteps();
        controller.connectOutlet('rMHighAvailabilityWizardStep3', controller.get('content'));
      })
    },
    unroutePath: function () {
      return false;
    },
    next: function (router) {
      var wizardController = router.get('rMHighAvailabilityWizardController');
      var stepController = router.get('rMHighAvailabilityWizardStep3Controller');
      var configs = stepController.get('selectedService.configs');
      wizardController.saveConfigs(configs);
      router.transitionTo('step4');
    },
    back: Em.Router.transitionTo('step2')
  }),

  step4: Em.Route.extend({
    route: '/step4',
    connectOutlets: function (router) {
      var controller = router.get('rMHighAvailabilityWizardController');
      controller.dataLoading().done(function () {
        controller.setCurrentStep('4');
        controller.setLowerStepsDisable(4);
        controller.loadAllPriorSteps();
        controller.connectOutlet('rMHighAvailabilityWizardStep4', controller.get('content'));
      })
    },
    unroutePath: function (router, path) {
      // allow user to leave route if wizard has finished
      if (router.get('rMHighAvailabilityWizardController').get('isFinished')) {
        this._super(router, path);
      } else {
        return false;
      }
    },
    next: function (router) {
      var controller = router.get('rMHighAvailabilityWizardController');
      controller.finish();
      App.clusterStatus.setClusterStatus({
        clusterName: controller.get('content.cluster.name'),
        clusterState: 'DEFAULT',
        localdb: App.db.data
      }, {alwaysCallback: function () {
        controller.get('popup').hide();
        router.transitionTo('main.services.index');
        location.reload();
      }});
    }
  })

});
