module.exports = [
  {
    id: '6',
    index: 1,
    title: '电源适配器',
    pattern: '适配器模式',
    patternEn: 'Adapter',
    category: '结构型模式',
    difficulty: '简单',
    background: '阿明从美国带回一台只支持 110V 的笔记本电脑，回国后直接插进办公室的国标插座，插座输出 220V，电脑立刻报警提示危险。他翻出旅行箱里的电源转换器接上，电压变成 110V，电脑终于正常充电。',
    summary: '将一个接口转换成客户期望的另一个接口，使原本不兼容的类可以协作。',
    concept: '适配器模式（Adapter）把一个类的接口转换成客户端期望的另一种接口，从而让原本因接口不兼容而无法一起工作的类能够协同工作。例如美版设备需要 110V 电压，而国标插座输出 220V，通过一个适配器把 220V 转换为 110V 再供设备使用。',
    structure: '参与者：\n- Target：客户端期望的接口。\n- Adaptee：需要被适配的现有类，如 220V 插座。\n- Adapter：包装 Adaptee，将其接口转换为 Target 接口（输出 110V）。\n- Client：使用 Target 接口的对象。',
    scenario: '适用场景：\n- 希望复用已有类，但其接口与当前系统不兼容。\n- 需要统一多个不同来源的接口，如对接第三方库、旧系统。\n- 不能修改原有类（或修改代价高），只能在其上增加适配层。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- direct：设备直接接入国标插座，输出 `danger: 220V`。\n- adapt：通过适配器接入，输出 `charging: 110V`。',
    samples: [
      { input: '2\ndirect\nadapt', output: 'danger: 220V\ncharging: 110V', explain: '适配器把 220V 转换为设备可用的 110V。' },
    ],
    testCases: [
      { input: '2\ndirect\nadapt', output: 'danger: 220V\ncharging: 110V' },
      { input: '3\nadapt\ndirect\nadapt', output: 'charging: 110V\ndanger: 220V\ncharging: 110V' },
    ],
    solutions: {
      python: `import sys

class ChineseSocket:
    def voltage(self):
        return 220

class USDevice:
    def charge(self, volt):
        return "charging: {}V".format(volt)

    def danger(self, volt):
        return "danger: {}V".format(volt)

class Adapter:
    def __init__(self, socket):
        self.socket = socket

    def voltage(self):
        return 110


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    device = USDevice()
    adapter = Adapter(ChineseSocket())
    t = int(data[0].strip())
    for i in range(1, t + 1):
        op = data[i].strip()
        if op == 'direct':
            print(device.danger(ChineseSocket().voltage()))
        elif op == 'adapt':
            print(device.charge(adapter.voltage()))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

class ChineseSocket {
    public int voltage() { return 220; }
}
class USDevice {
    public String charge(int volt) { return "charging: " + volt + "V"; }
    public String danger(int volt) { return "danger: " + volt + "V"; }
}
class Adapter {
    private ChineseSocket socket;
    public Adapter(ChineseSocket socket) { this.socket = socket; }
    public int voltage() { return 110; }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        USDevice device = new USDevice();
        Adapter adapter = new Adapter(new ChineseSocket());
        for (int i = 0; i < t; i++) {
            String op = br.readLine();
            if (op == null) break;
            op = op.trim();
            if ("direct".equals(op)) System.out.println(device.danger(new ChineseSocket().voltage()));
            else if ("adapt".equals(op)) System.out.println(device.charge(adapter.voltage()));
        }
    }
}
`,
    },
  },
  {
    id: '7',
    index: 2,
    title: '形状与颜色',
    pattern: '桥接模式',
    patternEn: 'Bridge',
    category: '结构型模式',
    difficulty: '中等',
    background: '学校艺术节要布置一面展墙，老师只准备了圆形和方形两种轮廓模板，以及红色和绿色两种颜料，每件作品都从这两组里各取一个组合而成。负责登记的小周要把同学们报上来的轮廓与颜色逐条整理成清单，一百多件作品一条都不能漏。',
    summary: '将抽象部分与实现部分分离，使二者可以独立变化。',
    concept: '桥接模式（Bridge）将抽象部分与它的实现部分分离，使二者可以独立地变化。这里“抽象”指形状（Circle、Square），“实现”指颜色（Red、Green）。形状持有颜色引用，通过组合而非继承来组合两者，从而把两个维度的扩展解耦，避免类数量爆炸。',
    structure: '参与者：\n- Abstraction：抽象部分，如 Shape，持有 Implementor 引用。\n- RefinedAbstraction：扩展抽象，如 Circle、Square。\n- Implementor：实现接口，如 Color。\n- ConcreteImplementor：具体实现，如 Red、Green。',
    scenario: '适用场景：\n- 一个类存在两个甚至多个独立变化的维度。\n- 不希望使用继承在两个维度间做笛卡尔积扩张。\n- 希望在运行时动态组合抽象与实现，如形状和渲染方式、消息与发送渠道。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- draw <shape> <color>：shape 为 circle 或 square，color 为 red 或 green。\n  输出 `<Color> <Shape>`，例如“Red Circle”。',
    samples: [
      { input: '4\ndraw circle red\ndraw square green\ndraw circle green\ndraw square red', output: 'Red Circle\nGreen Square\nGreen Circle\nRed Square', explain: '形状与颜色两个维度通过桥接自由组合。' },
    ],
    testCases: [
      { input: '4\ndraw circle red\ndraw square green\ndraw circle green\ndraw square red', output: 'Red Circle\nGreen Square\nGreen Circle\nRed Square' },
      { input: '2\ndraw square red\ndraw circle green', output: 'Red Square\nGreen Circle' },
    ],
    solutions: {
      python: `import sys

class Color:
    def name(self):
        pass

class Red(Color):
    def name(self):
        return "Red"

class Green(Color):
    def name(self):
        return "Green"

class Shape:
    def __init__(self, color):
        self.color = color

    def draw(self):
        pass

class Circle(Shape):
    def draw(self):
        return self.color.name() + " Circle"

class Square(Shape):
    def draw(self):
        return self.color.name() + " Square"


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    colors = {'red': Red(), 'green': Green()}
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        color = colors[parts[2]]
        shape = Circle(color) if parts[1] == 'circle' else Square(color)
        print(shape.draw())


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Color { String name(); }
class Red implements Color { public String name() { return "Red"; } }
class Green implements Color { public String name() { return "Green"; } }

abstract class Shape {
    protected Color color;
    public Shape(Color color) { this.color = color; }
    public abstract String draw();
}
class Circle extends Shape {
    public Circle(Color color) { super(color); }
    public String draw() { return color.name() + " Circle"; }
}
class Square extends Shape {
    public Square(Color color) { super(color); }
    public String draw() { return color.name() + " Square"; }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        Map<String, Color> colors = new HashMap<>();
        colors.put("red", new Red());
        colors.put("green", new Green());
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 3) continue;
            Color color = colors.get(parts[2]);
            Shape shape = "circle".equals(parts[1]) ? new Circle(color) : new Square(color);
            System.out.println(shape.draw());
        }
    }
}
`,
    },
  },
  {
    id: '8',
    index: 3,
    title: '文件系统',
    pattern: '组合模式',
    patternEn: 'Composite',
    category: '结构型模式',
    difficulty: '中等',
    background: '小周的课程设计越做越大，代码和素材在 root 下散成了好几层文件夹。答辩前导师要求他把整个目录结构原样导出成一棵树，每个文件后面标出大小，还要能随时说出某个文件夹连同子目录一共占了多少空间。',
    summary: '将对象组合成树形结构以表示“部分-整体”层次，使单个对象与组合对象被一致对待。',
    concept: '组合模式（Composite）将对象组织成树形结构，用来表示“部分-整体”的层次关系，使客户端能够以统一的方式处理单个对象（文件）和组合对象（目录）。目录和文件都实现同一接口（如 size()），对目录求大小时会递归汇总其子项。',
    structure: '参与者：\n- Component：叶子与组合节点共同遵循的抽象接口。\n- Leaf：叶子节点，如文件（FileNode）。\n- Composite：组合节点，持有子节点集合，如目录（DirNode）。\n- Client：通过 Component 接口统一操作树。',
    scenario: '适用场景：\n- 需要表示树形结构，如文件系统、组织架构、菜单、UI 控件层级。\n- 希望客户端统一处理整体与部分，而不必区分叶子与组合。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- dir <parent> <name>：在 parent 下创建目录（parent 为 root 表示根）。\n- file <parent> <name> <size>：在 parent 下创建大小为 size 的文件。\n- show：按插入顺序递归输出整棵树，目录名后加“/”，文件后加“(大小)”，每层缩进两个空格。\n- size <name>：输出某节点（含其子树）的总大小。',
    samples: [
      { input: '5\ndir root src\nfile src main.py 100\nfile src util.py 50\nfile root readme.md 10\nshow', output: 'src/\n  main.py(100)\n  util.py(50)\nreadme.md(10)', explain: '目录递归包含子节点，树形输出。' },
      { input: '4\ndir root src\nfile src a.txt 30\nfile src b.txt 20\nsize src', output: '50', explain: '目录大小等于其所有文件大小之和。' },
    ],
    testCases: [
      { input: '5\ndir root src\nfile src main.py 100\nfile src util.py 50\nfile root readme.md 10\nshow', output: 'src/\n  main.py(100)\n  util.py(50)\nreadme.md(10)' },
      { input: '4\ndir root src\nfile src a.txt 30\nfile src b.txt 20\nsize src', output: '50' },
    ],
    solutions: {
      python: `import sys

class Node:
    def __init__(self, name):
        self.name = name

    def size(self):
        return 0

class FileNode(Node):
    def __init__(self, name, size):
        super().__init__(name)
        self._size = size

    def size(self):
        return self._size

class DirNode(Node):
    def __init__(self, name):
        super().__init__(name)
        self.children = []

    def add(self, child):
        self.children.append(child)

    def size(self):
        return sum(c.size() for c in self.children)


def find(node, name):
    if node.name == name:
        return node
    if isinstance(node, DirNode):
        for c in node.children:
            r = find(c, name)
            if r:
                return r
    return None


def print_tree(node, depth):
    prefix = '  ' * depth
    if isinstance(node, DirNode):
        print(prefix + node.name + '/')
        for c in node.children:
            print_tree(c, depth + 1)
    else:
        print(prefix + node.name + '(' + str(node._size) + ')')


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    root = DirNode('root')
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'dir':
            find(root, parts[1]).add(DirNode(parts[2]))
        elif op == 'file':
            find(root, parts[1]).add(FileNode(parts[2], int(parts[3])))
        elif op == 'show':
            for c in root.children:
                print_tree(c, 0)
        elif op == 'size':
            print(find(root, parts[1]).size())


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

abstract class Node {
    String name;
    Node(String name) { this.name = name; }
    abstract int size();
}
class FileNode extends Node {
    int fsize;
    FileNode(String name, int size) { super(name); this.fsize = size; }
    int size() { return fsize; }
}
class DirNode extends Node {
    List<Node> children = new ArrayList<>();
    DirNode(String name) { super(name); }
    void add(Node child) { children.add(child); }
    int size() { int s = 0; for (Node c : children) s += c.size(); return s; }
}

public class Main {
    static Node find(Node node, String name) {
        if (node.name.equals(name)) return node;
        if (node instanceof DirNode) {
            for (Node c : ((DirNode) node).children) {
                Node r = find(c, name);
                if (r != null) return r;
            }
        }
        return null;
    }
    static void printTree(Node node, int depth) {
        StringBuilder prefix = new StringBuilder();
        for (int i = 0; i < depth; i++) prefix.append("  ");
        if (node instanceof DirNode) {
            System.out.println(prefix + node.name + "/");
            for (Node c : ((DirNode) node).children) printTree(c, depth + 1);
        } else {
            System.out.println(prefix + node.name + "(" + ((FileNode) node).fsize + ")");
        }
    }
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        DirNode root = new DirNode("root");
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("dir".equals(op)) {
                ((DirNode) find(root, parts[1])).add(new DirNode(parts[2]));
            } else if ("file".equals(op)) {
                ((DirNode) find(root, parts[1])).add(new FileNode(parts[2], Integer.parseInt(parts[3])));
            } else if ("show".equals(op)) {
                for (Node c : root.children) printTree(c, 0);
            } else if ("size".equals(op)) {
                System.out.println(find(root, parts[1]).size());
            }
        }
    }
}
`,
    },
  },
  {
    id: '9',
    index: 4,
    title: '咖啡加料',
    pattern: '装饰器模式',
    patternEn: 'Decorator',
    category: '结构型模式',
    difficulty: '中等',
    background: '校门口的咖啡店把基础咖啡定价 5 元，顾客可以再加牛奶、糖或奶油，三样分别加收 2 元、1 元和 3 元。店长让兼职的小林照每一张订单报出总价，有人一次加了三样，有人什么都不加，价钱一分都不能算错。',
    summary: '动态地给对象添加额外职责，比继承更灵活。',
    concept: '装饰器模式（Decorator）在不改变原有对象结构的前提下，动态地给对象添加额外功能。它通过一个包装类持有被装饰对象，并在调用同名前/后附加新行为。比如一杯基础咖啡 5 元，加牛奶 +2、加糖 +1、加奶油 +3，通过层层包装透明地累加价格。',
    structure: '参与者：\n- Component：抽象组件接口，如 Coffee。\n- ConcreteComponent：具体组件，好基础咖啡。\n- Decorator：抽象装饰器，持有 Component 引用并实现同一接口。\n- ConcreteDecorator：牛奶、糖、奶油等具体装饰器。',
    scenario: '适用场景：\n- 需要在不修改原类的情况下，动态扩展对象功能。\n- 扩展维度多且可任意组合，无法用静态继承穷举时。\n- 希望按需叠加而非一次性实现，如日志、权限、缓存、I/O 流包装。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- coffee [toppings...]：toppings 可为零个或多个 milk/sugar/cream，输出该杯咖啡的总价。\n  基础价 5；牛奶 +2、糖 +1、奶油 +3。',
    samples: [
      { input: '3\ncoffee\ncoffee milk\ncoffee sugar cream', output: '5\n7\n9', explain: '按所选配料逐层装饰并累加价格。' },
    ],
    testCases: [
      { input: '3\ncoffee\ncoffee milk\ncoffee sugar cream', output: '5\n7\n9' },
      { input: '2\ncoffee milk sugar\ncoffee cream', output: '8\n8' },
    ],
    solutions: {
      python: `import sys

class Coffee:
    def cost(self):
        return 5

class Decorator(Coffee):
    def __init__(self, coffee):
        self.coffee = coffee

    def cost(self):
        return self.coffee.cost()

class MilkDecorator(Decorator):
    def cost(self):
        return self.coffee.cost() + 2

class SugarDecorator(Decorator):
    def cost(self):
        return self.coffee.cost() + 1

class CreamDecorator(Decorator):
    def cost(self):
        return self.coffee.cost() + 3


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        coffee = Coffee()
        for topping in parts[1:]:
            if topping == 'milk':
                coffee = MilkDecorator(coffee)
            elif topping == 'sugar':
                coffee = SugarDecorator(coffee)
            elif topping == 'cream':
                coffee = CreamDecorator(coffee)
        print(coffee.cost())


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

interface Coffee { int cost(); }
class BaseCoffee implements Coffee { public int cost() { return 5; } }

class Decorator implements Coffee {
    protected Coffee coffee;
    Decorator(Coffee coffee) { this.coffee = coffee; }
    public int cost() { return coffee.cost(); }
}
class MilkDecorator extends Decorator {
    MilkDecorator(Coffee coffee) { super(coffee); }
    public int cost() { return coffee.cost() + 2; }
}
class SugarDecorator extends Decorator {
    SugarDecorator(Coffee coffee) { super(coffee); }
    public int cost() { return coffee.cost() + 1; }
}
class CreamDecorator extends Decorator {
    CreamDecorator(Coffee coffee) { super(coffee); }
    public int cost() { return coffee.cost() + 3; }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            Coffee coffee = new BaseCoffee();
            for (int k = 1; k < parts.length; k++) {
                if ("milk".equals(parts[k])) coffee = new MilkDecorator(coffee);
                else if ("sugar".equals(parts[k])) coffee = new SugarDecorator(coffee);
                else if ("cream".equals(parts[k])) coffee = new CreamDecorator(coffee);
            }
            System.out.println(coffee.cost());
        }
    }
}
`,
    },
  },
  {
    id: '10',
    index: 5,
    title: '家庭影院',
    pattern: '外观模式',
    patternEn: 'Facade',
    category: '结构型模式',
    difficulty: '简单',
    background: '张叔刚装修完新家，客厅里摆了电视、音响和播放器三台设备，看一部电影要挨个开机、调音、按下播放，散场后还得反过来一台台关掉。老伴嫌他手忙脚乱还总忘记关音响，催他做一个总开关，按一下就自动把该开的开、该关的关。',
    summary: '为一组复杂子系统提供统一的高层接口。',
    concept: '外观模式（Facade）为子系统中的一组接口提供一个统一的高层入口，使客户端只需与外观对象交互，而无需了解内部各子系统的复杂协作。例如“看电影”需要打开电视、音响、播放器等多个步骤，外观把这一系列操作封装成一次调用。',
    structure: '参与者：\n- Facade：统一门面，如 HomeTheaterFacade。\n- Subsystems：多个子系统，如 TV、Sound、Player。\n- Client：只依赖 Facade，不直接接触子系统。',
    scenario: '适用场景：\n- 需要为复杂子系统提供简单、易用的入口。\n- 需要将客户端与子系统解耦，隔离内部复杂依赖。\n- 系统分层时，为每层定义统一门面。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- watch：依次输出 `TV on`、`Sound on`、`Player play`（各占一行）。\n- end：依次输出 `Player stop`、`Sound off`、`TV off`（各占一行）。',
    samples: [
      { input: '2\nwatch\nend', output: 'TV on\nSound on\nPlayer play\nPlayer stop\nSound off\nTV off', explain: '门面封装了开启和关闭的一整套流程。' },
    ],
    testCases: [
      { input: '2\nwatch\nend', output: 'TV on\nSound on\nPlayer play\nPlayer stop\nSound off\nTV off' },
      { input: '1\nwatch', output: 'TV on\nSound on\nPlayer play' },
    ],
    solutions: {
      python: `import sys

class TV:
    def on(self):
        print("TV on")
    def off(self):
        print("TV off")

class Sound:
    def on(self):
        print("Sound on")
    def off(self):
        print("Sound off")

class Player:
    def play(self):
        print("Player play")
    def stop(self):
        print("Player stop")

class HomeTheaterFacade:
    def __init__(self):
        self.tv = TV()
        self.sound = Sound()
        self.player = Player()

    def watch_movie(self):
        self.tv.on()
        self.sound.on()
        self.player.play()

    def end_movie(self):
        self.player.stop()
        self.sound.off()
        self.tv.off()


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    facade = HomeTheaterFacade()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        op = data[i].strip()
        if op == 'watch':
            facade.watch_movie()
        elif op == 'end':
            facade.end_movie()


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

class TV { void on() { System.out.println("TV on"); } void off() { System.out.println("TV off"); } }
class Sound { void on() { System.out.println("Sound on"); } void off() { System.out.println("Sound off"); } }
class Player { void play() { System.out.println("Player play"); } void stop() { System.out.println("Player stop"); } }

class HomeTheaterFacade {
    private TV tv = new TV();
    private Sound sound = new Sound();
    private Player player = new Player();
    void watchMovie() { tv.on(); sound.on(); player.play(); }
    void endMovie() { player.stop(); sound.off(); tv.off(); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        HomeTheaterFacade facade = new HomeTheaterFacade();
        for (int i = 0; i < t; i++) {
            String op = br.readLine();
            if (op == null) break;
            op = op.trim();
            if ("watch".equals(op)) facade.watchMovie();
            else if ("end".equals(op)) facade.endMovie();
        }
    }
}
`,
    },
  },
  {
    id: '11',
    index: 6,
    title: '文本渲染共享',
    pattern: '享元模式',
    patternEn: 'Flyweight',
    category: '结构型模式',
    difficulty: '中等',
    background: '小周在写一个简易文本编辑器，文档里的每个字符都要带上颜色样式。他起初给每个字符单独建一个样式对象，一篇两万字的稿子内存涨得厉害，而全文其实只用了黑、红、蓝三种颜色。于是他改成按颜色保存样式，字符只记住自己用的是哪一种。',
    summary: '共享大量细粒度对象，以节省内存。',
    concept: '享元模式（Flyweight）通过共享来支持大量细粒度对象，从而减少内存占用。它把对象状态分为内在状态（可共享，如字符的颜色）与外在状态（不可共享，如字符在文本中的位置）。文本渲染器为相同颜色复用同一个样式对象，而不是为每个字符都新建一个样式。',
    structure: '参与者：\n- Flyweight：可共享对象的接口，如 Style。\n- ConcreteFlyweight：具体享元对象。\n- FlyweightFactory：工厂与缓存，保证同键返回同一享元实例。\n- Client：持有外在状态，复用享元对象。',
    scenario: '适用场景：\n- 系统需要创建大量相似对象，内存开销成为瓶颈。\n- 对象的大部分状态可提取为可共享的内在状态。\n- 经典例子：文本编辑器字符样式、GUI 控件、围棋棋子、线程池。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- put <char> <color>：向文档添加一个带颜色样式的字符。\n- chars：输出文档中的字符总数。\n- styles：输出实际创建的不同样式（享元）对象数。',
    samples: [
      { input: '5\nput A red\nput B red\nput C blue\nchars\nstyles', output: '3\n2', explain: '3 个字符共享了 2 种颜色样式对象。' },
    ],
    testCases: [
      { input: '5\nput A red\nput B red\nput C blue\nchars\nstyles', output: '3\n2' },
      { input: '4\nput X red\nput Y red\nput Z red\nstyles', output: '1' },
    ],
    solutions: {
      python: `import sys

class Style:
    def __init__(self, color):
        self.color = color

class StyleFactory:
    def __init__(self):
        self.styles = {}

    def get(self, color):
        if color not in self.styles:
            self.styles[color] = Style(color)
        return self.styles[color]

class Character:
    def __init__(self, ch, style):
        self.ch = ch
        self.style = style

class Document:
    def __init__(self):
        self.chars = []

    def add(self, ch, style):
        self.chars.append(Character(ch, style))


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    factory = StyleFactory()
    doc = Document()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'put':
            doc.add(parts[1], factory.get(parts[2]))
        elif op == 'chars':
            print(len(doc.chars))
        elif op == 'styles':
            print(len(factory.styles))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

class Style {
    String color;
    Style(String color) { this.color = color; }
}
class StyleFactory {
    private Map<String, Style> styles = new HashMap<>();
    Style get(String color) {
        if (!styles.containsKey(color)) styles.put(color, new Style(color));
        return styles.get(color);
    }
    int styleCount() { return styles.size(); }
}
class Document {
    int count = 0;
    void add(char ch, Style style) { count++; }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        StyleFactory factory = new StyleFactory();
        Document doc = new Document();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("put".equals(op)) {
                doc.add(parts[1].charAt(0), factory.get(parts[2]));
            } else if ("chars".equals(op)) {
                System.out.println(doc.count);
            } else if ("styles".equals(op)) {
                System.out.println(factory.styleCount());
            }
        }
    }
}
`,
    },
  },
  {
    id: '12',
    index: 7,
    title: '图片懒加载',
    pattern: '代理模式',
    patternEn: 'Proxy',
    category: '结构型模式',
    difficulty: '简单',
    background: '毕业相册的网页一打开就要铺满上百张照片，全部加载会让页面卡很久，而同学们多半只看前几张。负责开发的小何改成点开哪张才真正去加载，并在加载时先给一行提示，之后再翻到同一张就直接展示，不再重复读取。',
    summary: '为另一个对象提供替身，以控制对该对象的访问。',
    concept: '代理模式（Proxy）为另一个对象提供一个替身或占位符，以控制对它的访问。图片代理（ProxyImage）在首次显示时才真正加载真实图片（RealImage），之后直接复用缓存，从而把昂贵的加载操作推迟到真正需要时（懒加载），并避免重复加载。',
    structure: '参与者：\n- Subject：真实对象与代理共同遵循的接口，如 display()。\n- RealSubject：真实对象，如 RealImage。\n- Proxy：持有 RealSubject 引用，控制访问、延迟创建或加缓存。',
    scenario: '适用场景：\n- 懒加载：延迟创建开销大的对象，如大图、文档。\n- 访问控制：权限校验代理。\n- 远程代理：本地替身代表远程对象；日志/缓存代理等。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- show <name>：请求显示某图片。首次请求某图片时先输出 `Loading <name>` 再输出 `Showing <name>`；之后再次请求同一图片只输出 `Showing <name>`。',
    samples: [
      { input: '4\nshow a.png\nshow b.png\nshow a.png\nshow b.png', output: 'Loading a.png\nShowing a.png\nLoading b.png\nShowing b.png\nShowing a.png\nShowing b.png', explain: '同一图片仅加载一次，之后命中缓存。' },
    ],
    testCases: [
      { input: '4\nshow a.png\nshow b.png\nshow a.png\nshow b.png', output: 'Loading a.png\nShowing a.png\nLoading b.png\nShowing b.png\nShowing a.png\nShowing b.png' },
      { input: '3\nshow x.jpg\nshow x.jpg\nshow y.jpg', output: 'Loading x.jpg\nShowing x.jpg\nShowing x.jpg\nLoading y.jpg\nShowing y.jpg' },
    ],
    solutions: {
      python: `import sys

class Image:
    def display(self):
        pass

class RealImage(Image):
    def __init__(self, name):
        self.name = name
        self.load()

    def load(self):
        print("Loading " + self.name)

    def display(self):
        print("Showing " + self.name)

class ProxyImage(Image):
    def __init__(self, name):
        self.name = name
        self.real = None

    def display(self):
        if self.real is None:
            self.real = RealImage(self.name)
        print("Showing " + self.name)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    cache = {}
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        name = parts[1]
        if name not in cache:
            cache[name] = ProxyImage(name)
        cache[name].display()


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Image { void display(); }
class RealImage implements Image {
    String name;
    RealImage(String name) { this.name = name; load(); }
    void load() { System.out.println("Loading " + name); }
    public void display() { System.out.println("Showing " + name); }
}
class ProxyImage implements Image {
    String name;
    RealImage real = null;
    ProxyImage(String name) { this.name = name; }
    public void display() {
        if (real == null) real = new RealImage(name);
        System.out.println("Showing " + name);
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        Map<String, ProxyImage> cache = new HashMap<>();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 2) continue;
            String name = parts[1];
            if (!cache.containsKey(name)) cache.put(name, new ProxyImage(name));
            cache.get(name).display();
        }
    }
}
`,
    },
  },
];