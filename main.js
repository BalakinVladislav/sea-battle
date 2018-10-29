function addEvent(evnt, elem, func) {
    if (elem.addEventListener)  // W3C DOM
        elem.addEventListener(evnt,func,false);
    else if (elem.attachEvent) { // IE DOM
        elem.attachEvent("on"+evnt, func);
    }
    else { // No much to do
        elem[evnt] = func;
    }
}
function deleteEvent(evnt, elem, func) {
    if (elem.removeEventListener)  // W3C DOM
        elem.removeEventListener(evnt,func);
    else if (elem.detachEvent) { // IE DOM
        elem.detachEvent("on"+evnt, func);
    }
    else { // No much to do
        elem[evnt] = func;
    }
}
window.onload = function() {
    function Battlefield(field) {
            this.shipsData	= [
                '',
                [4, 'fourth'],
                [3, 'triple'],
                [2, 'double'],
                [1, 'single']
            ];
            this.field = field;
            // подсчет количества попаданий владельца поля,
            // при 20 попаданиях повержены все корабли, а значит игрок победил
            this.points = 0;
    }
    var aiField = getElement('ai-field');
    var user = new Battlefield('user-field');
    var ai;

    Battlefield.prototype.placeShips = function () {
        this.fieldMatrix = createPureField(this.field);

        for (var shipsAmountOfType = 1, length = this.shipsData.length; shipsAmountOfType < length; shipsAmountOfType++) {
            // shipsAmountOfType равно количеству кораблей для данного типа корабля

            var shipLength = this.shipsData[shipsAmountOfType][0]; // кол-во палуб
            for (var j = 0; j < shipsAmountOfType; j++) {
                // получаем координаты первой палубы и направление расположения
                var shipInfo = this.shipLocation(shipLength);
                var k =0; // счетчик палуб корабля
                while (k < shipLength) {
                    // записываем координаты корабля в матрицу игрового поля
                    // kx и ky определяет направление расположения корабля
                    this.fieldMatrix[shipInfo.x + k * shipInfo.kx][shipInfo.y + k * shipInfo.ky] = 1;
                    // Для поля юзера отобразим положение кораблей
                    if (this.field === 'user-field') {
                        var square = getElementByClass((shipInfo.x + k * shipInfo.kx).toString() +
                            '-' + (shipInfo.y + k * shipInfo.ky).toString(), 0);
                        square.classList.add('ship')
                    }
                    k++;
                }
            }
        }

    }

    Battlefield.prototype.shipLocation = function (shipLength) {
        // случайным образом определяем как будет расположен корабль, вертикально или горизонтально
        var kx = getRandom(1),
            ky = (kx === 0) ? 1 : 0,
            x, y;
        // в зависимости от направления расположения, генерируем начальные координаты
        if (kx === 0) {
            x = getRandom(9);
            y = getRandom(10 - shipLength);
        } else {
            x = getRandom(10 - shipLength);
            y = getRandom(9);
        }

        var checkValidOfPosition = this.validationOfLocation(x, y, kx, ky, shipLength);

        if (!checkValidOfPosition) return this.shipLocation(shipLength)

        var obj = {
            x: x,
            y: y,
            kx: kx,
            ky: ky
        };
        return obj;
    }

    Battlefield.prototype.validationOfLocation = function (x, y, kx, ky, decks) {
        // Функция проверяет все клетки вокруг корабля и самого корабля на наличие там других кораблей
        var fromX, toX, fromY, toY; // переменные формирующие нужный прямоугольник

        // определяем находится ли начальная координата корабля в крайнем положении,
        // если нет то захватываем еще одну клетку
        fromX = (x === 0) ? x : x - 1;
        // определяем прижат ли конец корабля к крайнему положению
        if (x + kx * decks === 10 && kx === 1) toX = x + kx * decks;
        // если нет то отодвигаемся от конца
        else if (x + kx * decks < 10 && kx === 1) toX = x + kx * decks + 1;
        // корабль расположен горизонтально и находится в крайнем положении
        else if (x === 9 && kx === 0) toX = x + 1;
        // корабль находится горизонтально и не в крайнем положении
        else if (x < 9 && kx === 0) toX = x + 2;

        // те же самые условия для другой координаты
        fromY = (y === 0) ? y : y - 1;
        if (y + ky * decks === 10 && ky === 1) toY = y + ky * decks;
        else if (y + ky * decks < 10 && ky === 1) toY = y + ky * decks + 1;
        else if (y === 9 && ky === 0) toY = y + 1;
        else if (y < 9 && ky === 0) toY = y + 2;

        if (toX === undefined || toY === undefined) return false;

        for (var i = fromX; i < toX; i++) {
            for (var j = fromY; j < toY; j++) {
                // если хоть одна координата в прямоугольнике занята кораблем, то проверка не пройдена
                if (this.fieldMatrix[i][j] === 1) return false;
            }
        }
        return true;
    }

    Battlefield.prototype.cleanField = function (name) {
        var field = getElement(name);
        while (field.firstChild) {
            field.removeChild(field.firstChild);
        }
        this.fieldMatrix = null;
        this.points = 0;
    }

    var Game = (function () {
        var textHelper = getElement('text-helper');
        var shooter, enemy, self, coordinates;
        var methods = {
            start: function () {
                self = this;
                // создаем игровое поле компьютера и расставляем корабли
                ai = new Battlefield('ai-field');
                ai.placeShips();

                // определяем кто стреляет первым
                var rnd = getRandom(1);
                shooter = (rnd === 0) ? user : ai;
                enemy = (shooter === user) ? ai : user;
                //конфигурируем матрицы выстрелов для бота
                self.setCoordinatesMatrix();

                if (shooter === user) {
                    self.showTextHelper('Ваш выстрел');
                    addEvent('click', aiField, self.shot);
                } else {
                    self.showTextHelper('Выстрел компьютера');
                    self.shot();
                }

            },
            shot: function (e) {
                // в зависимости от того кто совершил выстрел, получаем координаты выстрела
                if (shooter === user) {
                    coordinates = e.target.className.match(/ (.+)/)[1].split('-').map(element => parseInt(element));
                } else {
                    coordinates = self.getAiCoordinates();
                }
                let x, y;
                 [x, y] = coordinates;
                // получаем значение по координатам выстрела
                var fieldValue = enemy.fieldMatrix[x][y];


                switch (fieldValue) {
                    case 0:
                        // значение 2 означает промах по клетке
                        enemy.fieldMatrix[x][y] = 2;
                        shooter === user ?
                            self.showTextHelper('Вы промахнулись, стреляет компьютер') :
                            self.showTextHelper('Компьютер промазал, ваш выстрел');

                        //смена ролей
                        shooter = shooter === user ? ai : user;
                        enemy = shooter === user ? ai : user;

                        if (shooter === ai) {
                            // следующий выстрел будет делать компьютер,
                            // поэтому убираем возможность выстрелить игроку и инициируем выстрел компьютера
                            e.target.classList.add('mistake');
                            deleteEvent('click', aiField, self.shot)
                            //aiField.removeEventListener('click', self.shot)
                            setTimeout(function() {
                                return self.shot();
                            }, 500);
                        } else {
                            // следующий выстрел делает игрок, добавляем возможность совершить выстрел
                            var square = getElementByClass((x) + '-' + (y),0);
                            square.classList.add('mistake');
                            addEvent('click', aiField, self.shot);
                        }
                        break;

                    case 1:
                        // значение 3 означает попадание по кораблю
                        enemy.fieldMatrix[x][y] = 3;
                        // добавляем очки
                        shooter.points++;

                        if (shooter === user) {
                            e.target.classList.add('kill')
                            self.deleteDiagonaleCoordinates(x,y);
                            self.showTextHelper('Вы попали, ваш выстрел')
                            if (shooter.points === 20) {
                                shooter === user ?
                                    self.showTextHelper('Вы победили') :
                                    self.showTextHelper('Победил компьютер')
                                return;
                            }
                        } else {
                            var square = getElementByClass((x) + '-' + (y),0);
                            square.classList.add('kill');
                            self.showTextHelper('Компьютер попал, он продолжает');
                            if (shooter.points === 20) {
                                shooter === user ?
                                    self.showTextHelper('Вы победили') :
                                    self.showTextHelper('Победил компьютер')
                                return;
                            }
                            self.deleteDiagonaleCoordinates(x,y);
                            self.getAroundCoordinates(x,y);
                            setTimeout(function() {
                                return self.shot();
                            }, 500);
                        }

                        break;
                }

            },
            setCoordinatesMatrix: function () {
                // Генерируем три матрицы
                ai.allCoordinates = []; //содержит все возможные координаты
                ai.optimalCoordinates = []; // содержит координаты оптимальные для нахождения самого большого корабля
                ai.aroundCoordinates = []; // динамический массив содержащий координаты вокруг клетки
                // в которую попал компьютер
                ai.startingPoints = [[ [6,0], [2,0], [0,2], [0,6] ],
                    [ [3,0], [7,0], [9,2], [9,6] ]]; // вспомогательная матрица для формирования
                // оптимальных диагональных координат

                for (var i = 0; i < 10; i++) {
                    for(var j = 0; j < 10; j++) {
                        ai.allCoordinates.push([i, j]);
                    }
                }

                for (var i = 0, length = ai.startingPoints.length; i < length; i++) {
                    var arr = ai.startingPoints[i];
                    for (var j = 0, lh = arr.length; j < lh; j++) {
                        var x = arr[j][0],
                            y = arr[j][1];

                        switch(i) {
                            case 0:
                                while(x <= 9 && y <= 9) {
                                    ai.optimalCoordinates.push([x,y]);
                                    x = (x <= 9) ? x : 9;
                                    y = (y <= 9) ? y : 9;
                                    x++; y++;
                                }
                                break;

                            case 1:
                                while(x >= 0 && x <= 9 && y <= 9) {
                                    ai.optimalCoordinates.push([x,y]);
                                    x = (x >= 0 && x <= 9) ? x : (x < 0) ? 0 : 9;
                                    y = (y <= 9) ? y : 9;
                                    x--; y++;
                                }
                                break;
                        }
                    }
                }

                function compareRandom() {
                    return Math.random() - 0.5;
                }
                // перемешиваем матрицы
                ai.allCoordinates.sort(compareRandom);
                ai.optimalCoordinates.sort(compareRandom);
            },
            getAiCoordinates: function () {
                // первым делом просматриваем координаты вокруг попадания,
                // если их нет то берем опимальную координату,
                // если отпимальные координаты закончились то смотрим оставшиемся
                var nextCoordinates = ai.aroundCoordinates.length > 0 ?
                    ai.aroundCoordinates.pop() :
                    ai.optimalCoordinates.length > 0 ?
                        ai.optimalCoordinates.pop() :
                        ai.allCoordinates.pop();

                var [x, y] = nextCoordinates;
                var obj = {
                    x: x,
                    y: y
                };

                self.deleteExtraCoordinates(ai.optimalCoordinates, obj)

                self.deleteExtraCoordinates(ai.allCoordinates, obj)

                return [x,y];
            },
            getAroundCoordinates: function (x,y) {
                // собираем координаты в которых может находиться продолжение корабля
                var around = filterCoordinates([[x+1,y], [x-1,y], [x, y+1], [x, y-1]]);
                // оставляем в соседних координатах только те в которых может находиться корабль
                if (shooter === ai)
                shooter.aroundCoordinates = [...shooter.aroundCoordinates, ...around].filter(i =>
                    enemy.fieldMatrix[i[0]][i[1]] === 0 || enemy.fieldMatrix[i[0]][i[1]] === 1);
            },
            deleteDiagonaleCoordinates: function(x,y) {
                // удаляем из всех матриц диагональные координаты,
                // в которых точно не может находиться палуба и отмечаем эти клетки как проверенные
                // (когда бьет пользователь соответственно не нужно работать ни с какими массивами)
                var diag = filterCoordinates([[x+1,y+1], [x-1,y-1], [x-1, y+1], [x+1, y-1]]);
                diag.forEach(i => {
                    if (shooter === ai) {
                        self.deleteExtraCoordinates(ai.optimalCoordinates,
                            {
                                x: i[0],
                                y: i[1]
                            }
                        );
                        self.deleteExtraCoordinates(ai.allCoordinates,
                            {
                                x: i[0],
                                y: i[1]
                            }
                        );}
                    enemy.fieldMatrix[i[0]][i[1]] = 2;
                    var square = getElementByClass((i[0]) + '-' + (i[1]), (shooter === user) ? 1 : 0);
                    square.classList.add('mistake');
                })
            },
            deleteExtraCoordinates: function (arr, obj) {
                for (var coord = 0; coord < arr.length; coord++) {
                    // находим ячейку массива, в которой содержатся координата
                    // равная координате выстрела и удаляем эту ячейку
                    if (arr[coord][0] === obj.x && arr[coord][1] === obj.y) {
                        arr.splice(coord, 1);
                        break;
                    }
                }
            },
            showTextHelper: function (text) {
                textHelper.innerHTML= '';
                textHelper.innerHTML = text;
            }
        }
        return {methods: methods}
    }())
    var shipsRandomizer = getElement('randomed-ships');
    var startGame = getElement('start-game');
    var newGame = getElement('new-game');
    addEvent('click', shipsRandomizer, function() {
        user.cleanField('user-field');
        user.placeShips();
    });
    addEvent('click', startGame, function() {
        if (user.fieldMatrix) {
            getElement('start-game').style.display = 'none';
            getElement('randomed-ships').style.display = 'none';
            Game.methods.start();
        } else {
            Game.methods.showTextHelper('Расставьте корабли!')
        }
    })
    addEvent('click', newGame, function () {
        user.cleanField('user-field');
        ai.cleanField('ai-field');
        getElement('start-game').style.display = 'inline-block';
        getElement('randomed-ships').style.display = 'inline-block';
        Game.methods.showTextHelper('')
    })

    function getElement(id) {
        return document.getElementById(id);
    }

    function getElementByClass(name, position) {
        // не лучшее решение, position нужен чтобы определить к какому полю относится требуемый элемент
        // поскольку и у поля юзера и у поля компьютера нумерация ячеек одинаковая
        return document.getElementsByClassName(name)[position];
    }

    function createPureField(name) {
        // создаем пустое поле 10х10
        var x = 10, y = 10, arr = [10];
        for (var i = 0; i < x; i++) {
            arr[i] = [10];
            for(var j = 0; j < y; j++) {
                arr[i][j] = 0;
                var field = getElement(name);
                var cell = document.createElement('div');
                var indClass = (i) + '-' + (j);
                var hoverClass = name === 'ai-field' ? 'usercell ' : 'cell ';
                cell.className = hoverClass + indClass;
                field.appendChild(cell);
            }
        }
        return arr;
    }

    function filterCoordinates(arr) {
        // вспомогательная функция убирающая координаты вышедшие за пределы игрового поля
        return arr.filter(coord => coord[0] >=0 && coord[0] < 10 && coord[1] >= 0 && coord[1] < 10);
    }

    function getRandom(n) {
        // n - максимальное значение, которое хотим получить
        return Math.floor(Math.random() * (n + 1));
    }
}