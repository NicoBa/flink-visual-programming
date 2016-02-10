(function() {

    'use strict';

    angular
        .module('app.menu')
        .controller('MenuNavbarTopCtrl', MenuNavbarTopCtrl);

    /*@ngInject*/
    function MenuNavbarTopCtrl($scope, $rootScope, graphFactory, jsonBuilder, $log, $http, $uibModal, localStorageService) {

        $scope.clearGraph = clearGraph;
        $scope.exportGraph = exportGraph;
        $scope.importGraph = importGraph;
        $scope.runGraph = runGraph;
        $scope.getCode = getCode;
        $scope.getJar = getJar;
        $scope.undoGraph = undoGraph;
        $scope.redoGraph = redoGraph;
        $scope.exportHref = '#';

        $scope.importFile = null;
        $scope.onFileLoaded = onFileLoaded;
        $scope.onFileError = onFileError;

        function onFileLoaded() {
            var data = JSON.parse($scope.importFile);
            $rootScope.graph.fromJSON(data);
        }

        function onFileError(error) {
            $log.debug('onFileError');
            $log.debug(error);
        }

        function clearGraph() {
            graphFactory.clearGraph($rootScope.graph);
        }

        function exportGraph() {
            $scope.exportHref = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify($rootScope.graph.toJSON()));
        }

        function importGraph(argument) {
            $('.import-wrapper input[type="file"]').click();
        }

        $scope.openConfiguration = function() {
            $uibModal.open({
                templateUrl: '/app/generalsettings/generalsettings-modal.tpl.html',
                controller: 'generalsettingsModalCtrl',
                backdrop: 'static'
            });
        };

        function sendGraph(action) {
            var json = jsonBuilder.buildJson($rootScope.graph);
            var formData = {
                action: action,
                graph: json
            };
            $log.info('Sending', JSON.stringify(json));
            var generalSettings = graphFactory.getGeneralSettings();
            var postURL = generalSettings.flinkURL + ':' + generalSettings.flinkPort;
            $http.post(postURL + '/submit_jobgraph', formData, {responseType: 'blob'}).then(
                function successCallback(response) {
                    var regex = /filename="([\w\.]+)"/ig;
                    var contentDisposition = response.headers('Content-Disposition') || 'filename="default.zip"';
                    var filename = regex.exec(contentDisposition)[1];
                    var blob = new Blob([response.data], {type: 'application/zip'});
                    if (window.navigator.msSaveOrOpenBlob) {
                        window.navigator.msSaveBlob(blob, filename);
                    } else {
                        var elem = window.document.createElement('a');
                        elem.href = window.URL.createObjectURL(blob);
                        elem.download = filename;
                        document.body.appendChild(elem);
                        elem.click();
                        document.body.removeChild(elem);
                    }
                }, function errorCallback(response) {
                    $log.error('error while sending the jobgraph', response);
                }
            );
        }

        function runGraph() {
            sendGraph('deploy');
        }

        function getCode() {
            sendGraph('download_sources');
        }

        function getJar() {
            sendGraph('download_jar');
        }

        function undoGraph() {
            var lastGraph = graphFactory.graphHistory.pop();
            if (lastGraph !== null) {
                if ($rootScope.graph !== null) {
                    graphFactory.graphRedoStack.add($rootScope.graph.toJSON());
                }
                $rootScope.graph.fromJSON(lastGraph);
            }
        }

        function redoGraph() {
            var lastGraph = graphFactory.graphRedoStack.pop();
            if (lastGraph !== null) {
                if ($rootScope.graph !== null) {
                    graphFactory.graphHistory.add($rootScope.graph.toJSON());
                }
                $rootScope.graph.fromJSON(lastGraph);
            }
        }

        $scope.$watch(function() {
            return graphFactory.graphHistory.size();
        }, function(newVal, oldVal) {
            if (newVal > 0) {
                $scope.canUndo = true;
            } else {
                $scope.canUndo = false;
            }
        });

        $scope.$watch(function() {
            return graphFactory.graphRedoStack.size();
        }, function(newVal, oldVal) {
            if (newVal > 0) {
                $scope.canRedo = true;
            } else {
                $scope.canRedo = false;
            }
        });

    }

})();
