module.exports = [
  {
    id: '13',
    index: 1,
    title: '报销审批',
    pattern: '责任链模式',
    patternEn: 'Chain of Responsibility',
    category: '行为型模式',
    difficulty: '中等',
    background: '张伟在一家做工业传感器的公司跑销售，每到月底都要处理一摞出差报销单。公司规定一千元以内找经理签字，五千元以内找总监，再往上只能等 CEO 批复。以前他拿着一叠单子挨个办公室跑，还常常排错队，现在他希望系统能自动把每笔金额送到该管的人手里。',
    summary: '让多个对象都有机会处理请求，避免请求发送者与接收者耦合。',
    concept: '责任链模式（Chain of Responsibility）把多个处理者串成一条链，请求沿链传递，直到某个处理者处理为止。每个处理者持有下一个处理者的引用，如果自己能处理则处理，否则交给下一位。比如报销金额：经理可批 1000 以内，总监可批 5000 以内，超出则由 CEO 审批。',
    structure: '参与者：\n- Handler：抽象处理者，定义处理请求与设置后继者的接口。\n- ConcreteHandler：具体处理者，判断是否在自己权限内处理，否则转交后继者。\n- Client：把请求发给链首。',
    scenario: '适用场景：\n- 多个对象都可能处理同一请求，而具体由谁处理在运行时才能确定。\n- 希望灵活调整处理顺序或动态增删处理者。\n- 避免请求发送者与多个接收者硬编码耦合，如审批流、过滤器链、异常处理。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- apply <amount>：输出审批结果 `X approved N`。\n  规则：amount ≤ 1000 由 Manager 审批；≤ 5000 由 Director 审批；否则由 CEO 审批。',
    samples: [
      { input: '4\napply 500\napply 3000\napply 8000\napply 1500', output: 'Manager approved 500\nDirector approved 3000\nCEO approved 8000\nDirector approved 1500', explain: '请求沿经理→总监→CEO 的链条逐级传递。' },
    ],
    testCases: [
      { input: '4\napply 500\napply 3000\napply 8000\napply 1500', output: 'Manager approved 500\nDirector approved 3000\nCEO approved 8000\nDirector approved 1500' },
      { input: '2\napply 1000\napply 5000', output: 'Manager approved 1000\nDirector approved 5000' },
    ],
    solutions: {
      python: `import sys

class Approver:
    def __init__(self, name, limit):
        self.name = name
        self.limit = limit
        self.next = None

    def set_next(self, next_):
        self.next = next_
        return next_

    def approve(self, amount):
        if amount <= self.limit:
            print(self.name + " approved " + str(amount))
        elif self.next:
            self.next.approve(amount)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    manager = Approver('Manager', 1000)
    director = Approver('Director', 5000)
    ceo = Approver('CEO', float('inf'))
    manager.set_next(director).set_next(ceo)
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        manager.approve(int(parts[1]))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

abstract class Approver {
    String name;
    int limit;
    Approver next;
    Approver(String name, int limit) { this.name = name; this.limit = limit; }
    void setNext(Approver next) { this.next = next; }
    void approve(int amount) {
        if (amount <= limit) System.out.println(name + " approved " + amount);
        else if (next != null) next.approve(amount);
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        Approver manager = new Approver("Manager", 1000) {};
        Approver director = new Approver("Director", 5000) {};
        Approver ceo = new Approver("CEO", Integer.MAX_VALUE) {};
        manager.setNext(director); director.setNext(ceo);
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 2) continue;
            manager.approve(Integer.parseInt(parts[1]));
        }
    }
}
`,
    },
  },
  {
    id: '14',
    index: 2,
    title: '遥控器',
    pattern: '命令模式',
    patternEn: 'Command',
    category: '行为型模式',
    difficulty: '简单',
    background: '小周给外婆的老房子装了一盏客厅灯，配了个只有开、关和撤回三个按键的遥控器。外婆眼神不好，常按错键，一按错就急着想把灯调回原来那样亮着或关着。小周想，遥控器得记住刚才按的是哪一个动作，撤回时把灯恢复成相反的样子；没有按过的记录时，撤回键就当没按过。',
    summary: '将请求封装为对象，以支持参数化、排队、记录与撤销。',
    concept: '命令模式（Command）把一次请求（如“开灯”）封装成一个命令对象，从而使调用者（遥控器）与执行者（灯）解耦。遥控器只需按下命令按钮，不必知道灯如何工作；同时命令对象可以记录执行历史，从而支持撤销（undo）。',
    structure: '参与者：\n- Command：命令接口，声明 execute() 与 undo()。\n- ConcreteCommand：绑定接收者与动作，如 LightOnCommand/LightOffCommand。\n- Receiver：真正执行动作的对象，如 Light。\n- Invoker：触发命令的对象，如 RemoteControl。',
    scenario: '适用场景：\n- 需要把动作参数化，如按钮绑定可更换命令。\n- 需要支持撤销/重做、宏命令、命令日志。\n- 需要解耦请求发起者与执行者，如队列、事务、任务调度。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- on：开灯，输出 `light on`。\n- off：关灯，输出 `light off`。\n- undo：撤销上一次命令（开变关、关变开），输出相应的灯状态；无历史时忽略。',
    samples: [
      { input: '4\non\noff\nundo\non', output: 'light on\nlight off\nlight on\nlight on', explain: 'undo 撤销上一次 off，灯重新打开。' },
    ],
    testCases: [
      { input: '4\non\noff\nundo\non', output: 'light on\nlight off\nlight on\nlight on' },
      { input: '4\non\noff\nundo\nundo', output: 'light on\nlight off\nlight on\nlight off' },
    ],
    solutions: {
      python: `import sys

class Light:
    def on(self):
        print("light on")
    def off(self):
        print("light off")

class Command:
    def execute(self):
        pass
    def undo(self):
        pass

class LightOnCommand(Command):
    def __init__(self, light):
        self.light = light
    def execute(self):
        self.light.on()
    def undo(self):
        self.light.off()

class LightOffCommand(Command):
    def __init__(self, light):
        self.light = light
    def execute(self):
        self.light.off()
    def undo(self):
        self.light.on()

class RemoteControl:
    def __init__(self):
        self.history = []

    def press(self, command):
        command.execute()
        self.history.append(command)

    def undo(self):
        if self.history:
            self.history.pop().undo()


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    light = Light()
    on = LightOnCommand(light)
    off = LightOffCommand(light)
    remote = RemoteControl()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        op = data[i].strip()
        if op == 'on':
            remote.press(on)
        elif op == 'off':
            remote.press(off)
        elif op == 'undo':
            remote.undo()


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

class Light { void on() { System.out.println("light on"); } void off() { System.out.println("light off"); } }

interface Command { void execute(); void undo(); }
class LightOnCommand implements Command {
    private Light light;
    LightOnCommand(Light light) { this.light = light; }
    public void execute() { light.on(); }
    public void undo() { light.off(); }
}
class LightOffCommand implements Command {
    private Light light;
    LightOffCommand(Light light) { this.light = light; }
    public void execute() { light.off(); }
    public void undo() { light.on(); }
}
class RemoteControl {
    private Deque<Command> history = new ArrayDeque<>();
    void press(Command c) { c.execute(); history.push(c); }
    void undo() { if (!history.isEmpty()) history.pop().undo(); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        Light light = new Light();
        Command on = new LightOnCommand(light);
        Command off = new LightOffCommand(light);
        RemoteControl remote = new RemoteControl();
        for (int i = 0; i < t; i++) {
            String op = br.readLine();
            if (op == null) break;
            op = op.trim();
            if ("on".equals(op)) remote.press(on);
            else if ("off".equals(op)) remote.press(off);
            else if ("undo".equals(op)) remote.undo();
        }
    }
}
`,
    },
  },
  {
    id: '15',
    index: 3,
    title: '四则表达式求值',
    pattern: '解释器模式',
    patternEn: 'Interpreter',
    category: '行为型模式',
    difficulty: '困难',
    background: '在城东的少年编程班里，陈老师带学生做一个只会算加、减、乘的小工具。孩子们写的算式常常漏掉括号，算出来的结果五花八门，谁也说不清错在第几步。陈老师想了个新写法：运算符跟在它要处理的两个数后面，程序从左往右读一遍，先把能算的小块算出来，再一步步拼成最后的结果。',
    summary: '定义一种语言的文法，并用解释器来解释其中的句子。',
    concept: '解释器模式（Interpreter）给定一种语言，定义其文法表示，并提供一个解释器来处理该语言的句子。例如把后缀表达式（逆波兰式）解析成一棵表达式树，每个节点（数字、加法、减法、乘法）都实现 evaluate()，递归求值得到结果。',
    structure: '参与者：\n- AbstractExpression：声明解释操作 evaluate()。\n- TerminalExpression：终结符，如 Number。\n- NonTerminalExpression：非终结符，如 Add、Sub、Mul，持有子表达式。\n- Context/Parser：构建抽象语法树。',
    scenario: '适用场景：\n- 某类问题反复出现，可抽象成一种简单语言。\n- 文法简单、性能要求不苛刻时。\n- 经典场景：表达式求值、正则匹配、规则引擎、SQL 解析等。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- calc <token...>：token 为数字或运算符 +、-、*，按后缀表达式（逆波兰式）求值并输出结果。',
    samples: [
      { input: '3\ncalc 3 4 +\ncalc 10 2 *\ncalc 5 1 2 + 4 * +', output: '7\n20\n17', explain: '表达式树递归求值：(3+4)=7，10*2=20，5+(1+2)*4=17。' },
    ],
    testCases: [
      { input: '3\ncalc 3 4 +\ncalc 10 2 *\ncalc 5 1 2 + 4 * +', output: '7\n20\n17' },
      { input: '2\ncalc 9 5 -\ncalc 2 3 4 * +', output: '4\n14' },
    ],
    solutions: {
      python: `import sys

class Expression:
    def evaluate(self):
        pass

class Number(Expression):
    def __init__(self, value):
        self.value = value
    def evaluate(self):
        return self.value

class Add(Expression):
    def __init__(self, left, right):
        self.left = left
        self.right = right
    def evaluate(self):
        return self.left.evaluate() + self.right.evaluate()

class Sub(Expression):
    def __init__(self, left, right):
        self.left = left
        self.right = right
    def evaluate(self):
        return self.left.evaluate() - self.right.evaluate()

class Mul(Expression):
    def __init__(self, left, right):
        self.left = left
        self.right = right
    def evaluate(self):
        return self.left.evaluate() * self.right.evaluate()


def parse(tokens):
    stack = []
    for tok in tokens:
        if tok in ('+', '-', '*'):
            right = stack.pop()
            left = stack.pop()
            if tok == '+':
                stack.append(Add(left, right))
            elif tok == '-':
                stack.append(Sub(left, right))
            else:
                stack.append(Mul(left, right))
        else:
            stack.append(Number(int(tok)))
    return stack[-1]


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        expr = parse(parts[1:])
        print(expr.evaluate())


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Expression { int evaluate(); }
class Number implements Expression {
    int value;
    Number(int value) { this.value = value; }
    public int evaluate() { return value; }
}
class Add implements Expression {
    Expression left, right;
    Add(Expression l, Expression r) { left = l; right = r; }
    public int evaluate() { return left.evaluate() + right.evaluate(); }
}
class Sub implements Expression {
    Expression left, right;
    Sub(Expression l, Expression r) { left = l; right = r; }
    public int evaluate() { return left.evaluate() - right.evaluate(); }
}
class Mul implements Expression {
    Expression left, right;
    Mul(Expression l, Expression r) { left = l; right = r; }
    public int evaluate() { return left.evaluate() * right.evaluate(); }
}

public class Main {
    static Expression parse(String[] tokens) {
        Deque<Expression> stack = new ArrayDeque<>();
        for (String tok : tokens) {
            if ("+".equals(tok) || "-".equals(tok) || "*".equals(tok)) {
                Expression right = stack.pop();
                Expression left = stack.pop();
                if ("+".equals(tok)) stack.push(new Add(left, right));
                else if ("-".equals(tok)) stack.push(new Sub(left, right));
                else stack.push(new Mul(left, right));
            } else {
                stack.push(new Number(Integer.parseInt(tok)));
            }
        }
        return stack.pop();
    }
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            Expression expr = parse(Arrays.copyOfRange(parts, 1, parts.length));
            System.out.println(expr.evaluate());
        }
    }
}
`,
    },
  },
  {
    id: '16',
    index: 4,
    title: '集合遍历',
    pattern: '迭代器模式',
    patternEn: 'Iterator',
    category: '行为型模式',
    difficulty: '简单',
    background: '学校秋季运动会的报名表由六年级的林小雨负责，她要把报名的同学按先后顺序登记进一个名单里。班主任要求既能从头念一遍，也能从最后一个倒着念回来，好在广播里报出接力的出发顺序。名单还在不断加人，林小雨不想每换一种念法就重新抄一遍整张表，只希望两种念法都能直接在原名单上走一遍。',
    summary: '提供一种顺序访问聚合对象元素的方式，而不暴露其内部表示。',
    concept: '迭代器模式（Iterator）提供一种方法，顺序访问一个聚合对象中的各个元素，而又不暴露其内部表示。集合类提供正向迭代器和反向迭代器，客户端通过统一的 hasNext()/next() 接口遍历，而无需知道底层是数组、链表还是其他结构。',
    structure: '参与者：\n- Iterator：定义 hasNext()、next() 接口。\n- ConcreteIterator：具体迭代器，如正向、反向迭代器。\n- Aggregate：定义创建迭代器的接口。\n- ConcreteAggregate：具体集合，返回对应迭代器。',
    scenario: '适用场景：\n- 需要遍历一个聚合对象，且不想暴露其内部结构。\n- 需要为同一集合提供多种遍历方式（正向、反向、过滤）。\n- 希望统一不同容器的遍历接口。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- add <name>：向集合末尾加入一个元素。\n- list：按加入顺序输出所有元素（空格分隔）。\n- rev：按相反顺序输出所有元素（空格分隔）。',
    samples: [
      { input: '5\nadd a\nadd b\nadd c\nlist\nrev', output: 'a b c\nc b a', explain: '正向与反向迭代器分别遍历集合。' },
    ],
    testCases: [
      { input: '5\nadd a\nadd b\nadd c\nlist\nrev', output: 'a b c\nc b a' },
      { input: '4\nadd x\nadd y\nlist\nrev', output: 'x y\ny x' },
    ],
    solutions: {
      python: `import sys

class Iterator:
    def has_next(self):
        pass
    def next(self):
        pass

class ListIterator(Iterator):
    def __init__(self, items):
        self.items = items
        self.i = 0
    def has_next(self):
        return self.i < len(self.items)
    def next(self):
        v = self.items[self.i]
        self.i += 1
        return v

class ReverseIterator(Iterator):
    def __init__(self, items):
        self.items = items
        self.i = len(items) - 1
    def has_next(self):
        return self.i >= 0
    def next(self):
        v = self.items[self.i]
        self.i -= 1
        return v

class NameCollection:
    def __init__(self):
        self.items = []
    def add(self, name):
        self.items.append(name)
    def iterator(self):
        return ListIterator(self.items)
    def reverse_iterator(self):
        return ReverseIterator(self.items)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    col = NameCollection()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'add':
            col.add(parts[1])
        elif op in ('list', 'rev'):
            it = col.iterator() if op == 'list' else col.reverse_iterator()
            out = []
            while it.has_next():
                out.append(it.next())
            print(' '.join(out))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Iterator {
    boolean hasNext();
    String next();
}
class ListIterator implements Iterator {
    private List<String> items;
    private int i = 0;
    ListIterator(List<String> items) { this.items = items; }
    public boolean hasNext() { return i < items.size(); }
    public String next() { return items.get(i++); }
}
class ReverseIterator implements Iterator {
    private List<String> items;
    private int i;
    ReverseIterator(List<String> items) { this.items = items; this.i = items.size() - 1; }
    public boolean hasNext() { return i >= 0; }
    public String next() { return items.get(i--); }
}
class NameCollection {
    List<String> items = new ArrayList<>();
    void add(String name) { items.add(name); }
    Iterator iterator() { return new ListIterator(items); }
    Iterator reverseIterator() { return new ReverseIterator(items); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        NameCollection col = new NameCollection();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("add".equals(op)) {
                col.add(parts[1]);
            } else if ("list".equals(op) || "rev".equals(op)) {
                Iterator it = "list".equals(op) ? col.iterator() : col.reverseIterator();
                StringBuilder sb = new StringBuilder();
                boolean first = true;
                while (it.hasNext()) {
                    if (!first) sb.append(" ");
                    sb.append(it.next());
                    first = false;
                }
                System.out.println(sb.toString());
            }
        }
    }
}
`,
    },
  },
  {
    id: '17',
    index: 5,
    title: '聊天室',
    pattern: '中介者模式',
    patternEn: 'Mediator',
    category: '行为型模式',
    difficulty: '中等',
    background: '大四的 alice 拉了个毕业旅行群，把 bob 和 carol 一起喊了进来。三个人商量行程时，谁说的话都要让另外两个人看到，可要是每个人都单独发给其他两人，漏发一位就麻烦了。alice 希望群里只认一个入口：谁在群里说一句，群里其他人就都收到同样的一句，不必关心自己被发给谁。',
    summary: '用一个中介对象封装一组对象之间的交互，减少它们之间的耦合。',
    concept: '中介者模式（Mediator）定义一个中介对象来封装一组对象之间的交互，使各对象不再显式地相互引用，从而降低耦合。聊天室就是中介者：用户不直接联系其他用户，而是把消息发给聊天室，由聊天室负责转发给其余成员。',
    structure: '参与者：\n- Mediator：定义通信接口，如 ChatRoom。\n- ConcreteMediator：协调各 Colleague 的交互。\n- Colleague：参与者，如 User，通过中介者通信。',
    scenario: '适用场景：\n- 对象之间存在复杂的网状交互，难以维护。\n- 希望集中管理对象之间的通信逻辑。\n- 经典例子：聊天室、航空管制、GUI 组件协调。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- join <name>：用户加入聊天室。\n- send <from> <message...>：from 向其他所有成员广播消息，对每个其他成员（按加入顺序）输出一行 `<to> received from <from>: <message>`。',
    samples: [
      { input: '5\njoin alice\njoin bob\njoin carol\nsend alice hello\nsend bob hi', output: 'bob received from alice: hello\ncarol received from alice: hello\nalice received from bob: hi\ncarol received from bob: hi', explain: '用户不直接联系，消息由聊天室转发。' },
    ],
    testCases: [
      { input: '5\njoin alice\njoin bob\njoin carol\nsend alice hello\nsend bob hi', output: 'bob received from alice: hello\ncarol received from alice: hello\nalice received from bob: hi\ncarol received from bob: hi' },
      { input: '3\njoin a\njoin b\nsend a hello world', output: 'b received from a: hello world' },
    ],
    solutions: {
      python: `import sys

class ChatRoom:
    def __init__(self):
        self.users = []

    def register(self, user):
        self.users.append(user)

    def send(self, sender, message):
        for u in self.users:
            if u.name != sender:
                print(u.name + " received from " + sender + ": " + message)

class User:
    def __init__(self, name, room):
        self.name = name
        self.room = room

    def send(self, message):
        self.room.send(self.name, message)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    room = ChatRoom()
    users = {}
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'join':
            u = User(parts[1], room)
            room.register(u)
            users[u.name] = u
        elif op == 'send':
            users[parts[1]].send(' '.join(parts[2:]))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

class ChatRoom {
    private List<User> users = new ArrayList<>();
    void register(User user) { users.add(user); }
    void send(String sender, String message) {
        for (User u : users) {
            if (!u.name.equals(sender)) {
                System.out.println(u.name + " received from " + sender + ": " + message);
            }
        }
    }
}
class User {
    String name;
    ChatRoom room;
    User(String name, ChatRoom room) { this.name = name; this.room = room; }
    void send(String message) { room.send(name, message); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        ChatRoom room = new ChatRoom();
        Map<String, User> users = new HashMap<>();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("join".equals(op)) {
                User u = new User(parts[1], room);
                room.register(u);
                users.put(u.name, u);
            } else if ("send".equals(op)) {
                StringBuilder sb = new StringBuilder();
                for (int k = 2; k < parts.length; k++) {
                    if (k > 2) sb.append(" ");
                    sb.append(parts[k]);
                }
                users.get(parts[1]).send(sb.toString());
            }
        }
    }
}
`,
    },
  },
  {
    id: '18',
    index: 6,
    title: '编辑器撤销',
    pattern: '备忘录模式',
    patternEn: 'Memento',
    category: '行为型模式',
    difficulty: '中等',
    background: '退休的语文老师赵国栋在写一本回忆录，用的软件只有打字、存档、回退和查看四个功能。他常常一口气写下一大段，又觉得不理想，想回到上一次存盘时的样子继续改。令他安心的是，只要中途存过一次，回退就能把整篇文字还原成存档那一刻的内容，而不用自己重新敲一遍。',
    summary: '在不破坏封装的前提下，捕获并保存对象内部状态，以便之后恢复。',
    concept: '备忘录模式（Memento）在不破坏封装性的前提下，捕获一个对象的内部状态并保存到外部，以便之后把对象恢复到先前的状态。文本编辑器在 save 时生成内容快照（备忘录），undo 时从历史中取出快照恢复内容，实现撤销。',
    structure: '参与者：\n- Originator：需要保存/恢复状态的对象，如 Editor。\n- Memento：状态快照对象。\n- Caretaker：保管备忘录，如 History，负责存取但不修改。',
    scenario: '适用场景：\n- 需要实现撤销/恢复（undo/redo）功能。\n- 需要保存对象某个时刻的状态快照。\n- 经典例子：文本编辑器、游戏存档、事务回滚。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- type <word...>：向编辑器追加文本（以空格分隔）。\n- save：保存当前内容快照。\n- undo：撤销到最近一次保存的快照。\n- show：输出当前内容。',
    samples: [
      { input: '6\ntype hello\nsave\ntype world\nshow\nundo\nshow', output: 'hello world\nhello', explain: 'undo 恢复到保存时的内容。' },
    ],
    testCases: [
      { input: '6\ntype hello\nsave\ntype world\nshow\nundo\nshow', output: 'hello world\nhello' },
      { input: '5\ntype abc\nsave\ntype def\nundo\nshow', output: 'abc' },
    ],
    solutions: {
      python: `import sys

class Editor:
    def __init__(self):
        self.content = ''

    def type_(self, text):
        self.content = (self.content + ' ' + text).strip()

    def save(self):
        return Memento(self.content)

    def restore(self, memento):
        self.content = memento.content

    def show(self):
        print(self.content)

class Memento:
    def __init__(self, content):
        self.content = content

class History:
    def __init__(self):
        self.stack = []

    def push(self, memento):
        self.stack.append(memento)

    def pop(self):
        return self.stack.pop() if self.stack else None


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    editor = Editor()
    history = History()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'type':
            editor.type_(' '.join(parts[1:]))
        elif op == 'save':
            history.push(editor.save())
        elif op == 'undo':
            m = history.pop()
            if m:
                editor.restore(m)
        elif op == 'show':
            editor.show()


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

class Editor {
    String content = "";
    void type(String text) { content = (content + " " + text).trim(); }
    Memento save() { return new Memento(content); }
    void restore(Memento m) { content = m.content; }
    void show() { System.out.println(content); }
}
class Memento {
    String content;
    Memento(String content) { this.content = content; }
}
class History {
    Deque<Memento> stack = new ArrayDeque<>();
    void push(Memento m) { stack.push(m); }
    Memento pop() { return stack.isEmpty() ? null : stack.pop(); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        Editor editor = new Editor();
        History history = new History();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("type".equals(op)) {
                StringBuilder sb = new StringBuilder();
                for (int k = 1; k < parts.length; k++) {
                    if (k > 1) sb.append(" ");
                    sb.append(parts[k]);
                }
                editor.type(sb.toString());
            } else if ("save".equals(op)) {
                history.push(editor.save());
            } else if ("undo".equals(op)) {
                Memento m = history.pop();
                if (m != null) editor.restore(m);
            } else if ("show".equals(op)) {
                editor.show();
            }
        }
    }
}
`,
    },
  },
  {
    id: '19',
    index: 7,
    title: '天气站订阅',
    pattern: '观察者模式',
    patternEn: 'Observer',
    category: '行为型模式',
    difficulty: '简单',
    background: '城南中学的气象小组在教学楼顶装了一台温度计，想把它测到的温度同步到走廊的几块显示屏上。徐老师先给 alice 和 bob 常走的两处挂上了屏幕，别的楼层还在陆续加装，也有屏幕因为维修要摘下来。她希望温度一变，机器就按当前名单把新数字挨块送出去，已经摘掉的屏幕不再收到。',
    summary: '定义一对多依赖，当对象状态变化时通知所有依赖它的对象。',
    concept: '观察者模式（Observer）定义对象之间一对多的依赖关系，当一个对象（主题/被观察者）状态变化时，所有依赖它的对象（观察者）都会收到通知并自动更新。天气站是主题，各显示屏是观察者；温度更新时，订阅者按订阅顺序收到通知。',
    structure: '参与者：\n- Subject：被观察者，维护观察者列表并通知，如 WeatherStation。\n- Observer：观察者接口，声明 update()。\n- ConcreteObserver：具体观察者，如 Display。',
    scenario: '适用场景：\n- 一个对象的状态变化需要通知多个对象。\n- 希望对象间保持松耦合，被观察者不需知道观察者具体是谁。\n- 经典例子：事件监听、发布订阅、UI 数据绑定、消息推送。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- subscribe <name>：加入一个显示屏订阅者。\n- unsubscribe <name>：移除某订阅者。\n- update <temp>：更新温度，按订阅顺序通知每个订阅者输出 `<name> temperature: <temp>`。',
    samples: [
      { input: '5\nsubscribe alice\nsubscribe bob\nupdate 25\nunsubscribe alice\nupdate 30', output: 'alice temperature: 25\nbob temperature: 25\nbob temperature: 30', explain: '取消订阅后，alice 不再收到通知。' },
    ],
    testCases: [
      { input: '5\nsubscribe alice\nsubscribe bob\nupdate 25\nunsubscribe alice\nupdate 30', output: 'alice temperature: 25\nbob temperature: 25\nbob temperature: 30' },
      { input: '3\nsubscribe tom\nupdate 18\nupdate 19', output: 'tom temperature: 18\ntom temperature: 19' },
    ],
    solutions: {
      python: `import sys

class Observer:
    def update(self, temp):
        pass

class Display(Observer):
    def __init__(self, name):
        self.name = name
    def update(self, temp):
        print(self.name + " temperature: " + str(temp))

class WeatherStation:
    def __init__(self):
        self.observers = []

    def subscribe(self, observer):
        self.observers.append(observer)

    def unsubscribe(self, observer):
        if observer in self.observers:
            self.observers.remove(observer)

    def notify(self, temp):
        for o in self.observers:
            o.update(temp)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    station = WeatherStation()
    displays = {}
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'subscribe':
            d = Display(parts[1])
            displays[parts[1]] = d
            station.subscribe(d)
        elif op == 'unsubscribe':
            station.unsubscribe(displays[parts[1]])
        elif op == 'update':
            station.notify(int(parts[1]))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Observer { void update(int temp); }
class Display implements Observer {
    String name;
    Display(String name) { this.name = name; }
    public void update(int temp) { System.out.println(name + " temperature: " + temp); }
}
class WeatherStation {
    private List<Observer> observers = new ArrayList<>();
    void subscribe(Observer o) { observers.add(o); }
    void unsubscribe(Observer o) { observers.remove(o); }
    void notify(int temp) { for (Observer o : observers) o.update(temp); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        WeatherStation station = new WeatherStation();
        Map<String, Display> displays = new HashMap<>();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("subscribe".equals(op)) {
                Display d = new Display(parts[1]);
                displays.put(parts[1], d);
                station.subscribe(d);
            } else if ("unsubscribe".equals(op)) {
                station.unsubscribe(displays.get(parts[1]));
            } else if ("update".equals(op)) {
                station.notify(Integer.parseInt(parts[1]));
            }
        }
    }
}
`,
    },
  },
  {
    id: '20',
    index: 8,
    title: '自动售货机',
    pattern: '状态模式',
    patternEn: 'State',
    category: '行为型模式',
    difficulty: '中等',
    background: '地铁口的小卖部里放着一台旧售货机，老板娘刘姐发现它常把顺序搞错：还没收钱就出货，或者连着吞下两枚硬币。她希望机器自己清楚眼下收没收到钱：空着的时候按出货只提示还没投币，投了币再按出货就掉出饮料，然后重新回到等下一枚硬币的样子；已经收过钱时再投币则要提醒一句。',
    summary: '允许对象在内部状态改变时改变其行为，看起来像是改变了类。',
    concept: '状态模式（State）允许一个对象在其内部状态改变时改变它的行为，对象看起来像是修改了自己的类。它与大量 if-else 判断状态不同，而是把每种状态封装成独立的状态对象（无硬币、有硬币），事件（投入硬币、购买）被委托给当前状态对象处理，状态对象可切换上下文的状态。',
    structure: '参与者：\n- Context：持有当前状态对象，如 VendingMachine。\n- State：状态接口，声明处理事件的方法。\n- ConcreteState：具体状态，如 NoCoinState、HasCoinState。',
    scenario: '适用场景：\n- 对象行为随内部状态变化而变化，且状态较多、转换复杂。\n- 大量条件分支仅用于区分状态时。\n- 经典例子：售货机、订单流转、TCP 连接、游戏角色状态。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- insert：投入硬币（无硬币→有硬币，输出 `coin inserted`；已有硬币输出 `already has coin`）。\n- purchase：购买（有硬币→出货并回到无硬币，输出 `dispensing`；无硬币输出 `no coin`）。\n  初始状态为无硬币。',
    samples: [
      { input: '6\npurchase\ninsert\ninsert\npurchase\npurchase\ninsert', output: 'no coin\ncoin inserted\nalready has coin\ndispensing\nno coin\ncoin inserted', explain: '状态在无硬币与有硬币之间按事件切换。' },
    ],
    testCases: [
      { input: '6\npurchase\ninsert\ninsert\npurchase\npurchase\ninsert', output: 'no coin\ncoin inserted\nalready has coin\ndispensing\nno coin\ncoin inserted' },
      { input: '3\ninsert\npurchase\npurchase', output: 'coin inserted\ndispensing\nno coin' },
    ],
    solutions: {
      python: `import sys

class VendingMachine:
    def __init__(self):
        self.state = NoCoinState(self)

    def insert(self):
        self.state.insert()

    def purchase(self):
        self.state.purchase()

    def set_state(self, state):
        self.state = state

class State:
    def __init__(self, machine):
        self.machine = machine
    def insert(self):
        pass
    def purchase(self):
        pass

class NoCoinState(State):
    def insert(self):
        print("coin inserted")
        self.machine.set_state(HasCoinState(self.machine))
    def purchase(self):
        print("no coin")

class HasCoinState(State):
    def insert(self):
        print("already has coin")
    def purchase(self):
        print("dispensing")
        self.machine.set_state(NoCoinState(self.machine))


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    vm = VendingMachine()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        op = data[i].strip()
        if op == 'insert':
            vm.insert()
        elif op == 'purchase':
            vm.purchase()


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

class VendingMachine {
    State state = new NoCoinState(this);
    void insert() { state.insert(); }
    void purchase() { state.purchase(); }
    void setState(State s) { state = s; }
}
abstract class State {
    VendingMachine machine;
    State(VendingMachine machine) { this.machine = machine; }
    abstract void insert();
    abstract void purchase();
}
class NoCoinState extends State {
    NoCoinState(VendingMachine machine) { super(machine); }
    void insert() { System.out.println("coin inserted"); machine.setState(new HasCoinState(machine)); }
    void purchase() { System.out.println("no coin"); }
}
class HasCoinState extends State {
    HasCoinState(VendingMachine machine) { super(machine); }
    void insert() { System.out.println("already has coin"); }
    void purchase() { System.out.println("dispensing"); machine.setState(new NoCoinState(machine)); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        VendingMachine vm = new VendingMachine();
        for (int i = 0; i < t; i++) {
            String op = br.readLine();
            if (op == null) break;
            op = op.trim();
            if ("insert".equals(op)) vm.insert();
            else if ("purchase".equals(op)) vm.purchase();
        }
    }
}
`,
    },
  },
  {
    id: '21',
    index: 9,
    title: '智能计算器',
    pattern: '策略模式',
    patternEn: 'Strategy',
    category: '行为型模式',
    difficulty: '简单',
    background: '程序员老何在社区活动中心教老人用平板，几位学员想做一个算账的小工具：买菜时用加法，算找零时用减法，算总价时用乘法。麻烦的是每道题该用哪种运算要到当场才知道，不能写死。老何希望大家按键选好运算方式，计算器就照那种方式把两个数算出来，以后想添一种新运算也不用推翻原来的代码。',
    summary: '定义一系列算法，把它们封装起来并使它们可以互相替换。',
    concept: '策略模式（Strategy）定义一系列算法，把每个算法封装成一个独立类并使其可以互换，从而让算法可以独立于使用它的客户端而变化。计算器抽象出加、减、乘三种策略，客户端在运行时选择并注入不同策略，调用统一的 execute() 即可完成计算。',
    structure: '参与者：\n- Strategy：策略接口，声明算法方法如 do(a, b)。\n- ConcreteStrategy：具体策略，如 Add/Sub/Mul。\n- Context：持有策略引用并调用，如 Calculator。',
    scenario: '适用场景：\n- 有多种算法或规则，需要在运行时选择其一。\n- 希望避免大量 if-else/switch 分支。\n- 经典例子：排序策略、支付方式、折扣规则、压缩算法。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- calc <op> <a> <b>：op 为 add/sub/mul，输出 a 与 b 的对应运算结果。',
    samples: [
      { input: '3\ncalc add 3 5\ncalc sub 10 4\ncalc mul 6 7', output: '8\n6\n42', explain: '同一 Context 注入不同策略得到不同结果。' },
    ],
    testCases: [
      { input: '3\ncalc add 3 5\ncalc sub 10 4\ncalc mul 6 7', output: '8\n6\n42' },
      { input: '2\ncalc mul 7 8\ncalc sub 2 9', output: '56\n-7' },
    ],
    solutions: {
      python: `import sys

class Strategy:
    def do(self, a, b):
        pass

class AddStrategy(Strategy):
    def do(self, a, b):
        return a + b

class SubStrategy(Strategy):
    def do(self, a, b):
        return a - b

class MulStrategy(Strategy):
    def do(self, a, b):
        return a * b

class Calculator:
    def __init__(self, strategy):
        self.strategy = strategy

    def execute(self, a, b):
        return self.strategy.do(a, b)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    strategies = {'add': AddStrategy(), 'sub': SubStrategy(), 'mul': MulStrategy()}
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        calc = Calculator(strategies[parts[1]])
        print(calc.execute(int(parts[2]), int(parts[3])))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Strategy { int doOp(int a, int b); }
class AddStrategy implements Strategy { public int doOp(int a, int b) { return a + b; } }
class SubStrategy implements Strategy { public int doOp(int a, int b) { return a - b; } }
class MulStrategy implements Strategy { public int doOp(int a, int b) { return a * b; } }

class Calculator {
    private Strategy strategy;
    Calculator(Strategy s) { strategy = s; }
    int execute(int a, int b) { return strategy.doOp(a, b); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        Map<String, Strategy> strategies = new HashMap<>();
        strategies.put("add", new AddStrategy());
        strategies.put("sub", new SubStrategy());
        strategies.put("mul", new MulStrategy());
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 4) continue;
            Calculator calc = new Calculator(strategies.get(parts[1]));
            System.out.println(calc.execute(Integer.parseInt(parts[2]), Integer.parseInt(parts[3])));
        }
    }
}
`,
    },
  },
  {
    id: '22',
    index: 10,
    title: '饮品制作',
    pattern: '模板方法模式',
    patternEn: 'Template Method',
    category: '行为型模式',
    difficulty: '简单',
    background: '巷口的早餐铺早上只做两样热饮：柠檬茶和加奶加糖的咖啡。老板娘周婶发现，两样饮品的步骤前后一致，先烧水，再冲泡，接着倒进杯子，最后加配料，只是中间泡的东西和最后加的料不同。她想让程序把这段顺序固定下来，只把两处不同的地方分别交给茶和咖啡去处理。',
    summary: '在父类中定义算法骨架，让子类实现具体步骤。',
    concept: '模板方法模式（Template Method）在一个方法中定义算法的骨架，而把其中某些步骤的实现延迟到子类。父类的 prepare() 固定了“烧水→冲泡→倒杯→加调料”的流程，子类只需改写“冲泡”与“加调料”两个步骤即可得到茶和咖啡两种饮品。',
    structure: '参与者：\n- AbstractClass：定义模板方法（算法骨架）与抽象步骤，如 Beverage。\n- ConcreteClass：实现具体步骤，如 Tea、Coffee。\n- 模板方法通常为 final，防止子类改变算法结构。',
    scenario: '适用场景：\n- 多个类共享相同算法骨架，仅个别步骤不同。\n- 希望把不变流程固定在父类、可变部分交给子类。\n- 经典例子：饮品冲泡、构建流程、框架中的生命周期钩子。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- make <type>：type 为 tea 或 coffee，按固定流程输出制作步骤，每步一行。\n  茶：Boil water → Steep tea leaves → Pour into cup → Add lemon。\n  咖啡：Boil water → Brew coffee grounds → Pour into cup → Add milk and sugar。',
    samples: [
      { input: '2\nmake tea\nmake coffee', output: 'Boil water\nSteep tea leaves\nPour into cup\nAdd lemon\nBoil water\nBrew coffee grounds\nPour into cup\nAdd milk and sugar', explain: '模板方法固定流程，子类实现冲泡与加调料两个步骤。' },
    ],
    testCases: [
      { input: '2\nmake tea\nmake coffee', output: 'Boil water\nSteep tea leaves\nPour into cup\nAdd lemon\nBoil water\nBrew coffee grounds\nPour into cup\nAdd milk and sugar' },
      { input: '1\nmake tea', output: 'Boil water\nSteep tea leaves\nPour into cup\nAdd lemon' },
    ],
    solutions: {
      python: `import sys

class Beverage:
    def prepare(self):
        self.boil_water()
        self.brew()
        self.pour()
        self.add_condiments()

    def boil_water(self):
        print("Boil water")

    def pour(self):
        print("Pour into cup")

    def brew(self):
        pass

    def add_condiments(self):
        pass

class Tea(Beverage):
    def brew(self):
        print("Steep tea leaves")
    def add_condiments(self):
        print("Add lemon")

class Coffee(Beverage):
    def brew(self):
        print("Brew coffee grounds")
    def add_condiments(self):
        print("Add milk and sugar")


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        if parts[1] == 'tea':
            Tea().prepare()
        else:
            Coffee().prepare()


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

abstract class Beverage {
    public final void prepare() {
        boilWater();
        brew();
        pour();
        addCondiments();
    }
    void boilWater() { System.out.println("Boil water"); }
    void pour() { System.out.println("Pour into cup"); }
    abstract void brew();
    abstract void addCondiments();
}
class Tea extends Beverage {
    void brew() { System.out.println("Steep tea leaves"); }
    void addCondiments() { System.out.println("Add lemon"); }
}
class Coffee extends Beverage {
    void brew() { System.out.println("Brew coffee grounds"); }
    void addCondiments() { System.out.println("Add milk and sugar"); }
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
            if (parts.length < 2) continue;
            if ("tea".equals(parts[1])) new Tea().prepare();
            else new Coffee().prepare();
        }
    }
}
`,
    },
  },
  {
    id: '23',
    index: 11,
    title: '图形面积计算',
    pattern: '访问者模式',
    patternEn: 'Visitor',
    category: '行为型模式',
    difficulty: '困难',
    background: '美院毕业的苏晴接了个给小区儿童活动区画地面图案的活儿，方案里有圆形和正方形两种色块。她每改一版都要算一遍涂料用量，圆形按半径、正方形按边长分别算面积，再乘单价报给物业；过几天物业又让她加算周长和边框费用。她希望以后每添一种新算法，圆和正方形那两段代码都不用动，只要把新算法单独写清楚就行。',
    summary: '将作用于某结构各元素上的操作与元素本身解耦，新增操作无需修改元素类。',
    concept: '访问者模式（Visitor）表示一个作用于某对象结构中各元素的操作，它使你能在不改变各元素类的前提下定义作用于这些元素的新操作。形状（圆、方形）通过 accept(visitor) 接收访问者，访问者针对每种具体形状实现对应的计算逻辑（如求面积），从而把“操作”与“数据结构”分离。',
    structure: '参与者：\n- Visitor：为每类元素声明 visit 方法，如 AreaVisitor。\n- ConcreteVisitor：具体访问者，实现各 visit 逻辑。\n- Element：声明 accept(visitor)。\n- ConcreteElement：实现 accept，调用 visitor 对应的 visit 方法。',
    scenario: '适用场景：\n- 对象结构稳定，但经常需要新增对元素的操作。\n- 希望把相关操作集中到访问者，而非散布在各元素类中。\n- 经典例子：编译器语法树遍历、报表统计、对象结构上的多种计算。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- area <shape> <n>：shape 为 circle 或 square（圆 n 为半径，方形 n 为边长），输出面积（保留两位小数，π 取 3.14）。',
    samples: [
      { input: '3\narea circle 3\narea square 5\narea circle 2', output: '28.26\n25.00\n12.56', explain: '访问者针对不同形状分别实现面积计算。' },
    ],
    testCases: [
      { input: '3\narea circle 3\narea square 5\narea circle 2', output: '28.26\n25.00\n12.56' },
      { input: '2\narea square 7\narea circle 1', output: '49.00\n3.14' },
    ],
    solutions: {
      python: `import sys

class Shape:
    def accept(self, visitor):
        pass

class Circle(Shape):
    def __init__(self, r):
        self.r = r
    def accept(self, visitor):
        return visitor.visit_circle(self)

class Square(Shape):
    def __init__(self, s):
        self.s = s
    def accept(self, visitor):
        return visitor.visit_square(self)

class AreaVisitor:
    def visit_circle(self, circle):
        return 3.14 * circle.r * circle.r

    def visit_square(self, square):
        return square.s * square.s


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    visitor = AreaVisitor()
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        n = int(parts[2])
        shape = Circle(n) if parts[1] == 'circle' else Square(n)
        area = shape.accept(visitor)
        print("{:.2f}".format(area))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

interface Shape { double accept(AreaVisitor visitor); }
class Circle implements Shape {
    int r;
    Circle(int r) { this.r = r; }
    public double accept(AreaVisitor visitor) { return visitor.visitCircle(this); }
}
class Square implements Shape {
    int s;
    Square(int s) { this.s = s; }
    public double accept(AreaVisitor visitor) { return visitor.visitSquare(this); }
}
class AreaVisitor {
    double visitCircle(Circle c) { return 3.14 * c.r * c.r; }
    double visitSquare(Square s) { return s.s * s.s; }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        AreaVisitor visitor = new AreaVisitor();
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 3) continue;
            int n = Integer.parseInt(parts[2]);
            Shape shape = "circle".equals(parts[1]) ? new Circle(n) : new Square(n);
            System.out.printf("%.2f%n", shape.accept(visitor));
        }
    }
}
`,
    },
  },
];